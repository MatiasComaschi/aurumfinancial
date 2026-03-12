import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET");

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error("Plaid credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plaidItems, error: dbError } = await supabase
      .from("plaid_items")
      .select("id, plaid_access_token, institution_name")
      .eq("user_id", user.id);

    if (dbError) {
      console.error("DB read error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to read linked accounts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plaidItems || plaidItems.length === 0) {
      return new Response(
        JSON.stringify({ transactions: [], accounts: [], message: "No linked accounts found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const startDate = sixtyDaysAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    let allTransactions: any[] = [];
    let allAccounts: any[] = [];
    const errors: string[] = [];

    for (const item of plaidItems) {
      try {
        // Fetch transactions (60 days)
        const txRes = await fetch("https://production.plaid.com/transactions/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: item.plaid_access_token,
            start_date: startDate,
            end_date: endDate,
            options: { count: 500, offset: 0 },
          }),
        });

        const txData = await txRes.json();

        if (!txRes.ok) {
          console.error(`Plaid error for ${item.institution_name}:`, JSON.stringify(txData));
          errors.push(`${item.institution_name}: ${txData.error_message || "Failed to fetch"}`);
          continue;
        }

        allTransactions = allTransactions.concat(txData.transactions || []);

        // Map accounts with institution info and plaid_item db id
        if (txData.accounts) {
          for (const acct of txData.accounts) {
            allAccounts.push({
              account_id: acct.account_id,
              name: acct.name || acct.official_name || "Account",
              type: acct.type,
              subtype: acct.subtype,
              current_balance: acct.balances?.current ?? null,
              available_balance: acct.balances?.available ?? null,
              institution_name: item.institution_name,
              plaid_item_id: item.id, // our DB id
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching from ${item.institution_name}:`, err);
        errors.push(`${item.institution_name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        transactions: allTransactions,
        accounts: allAccounts,
        total: allTransactions.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-transactions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
