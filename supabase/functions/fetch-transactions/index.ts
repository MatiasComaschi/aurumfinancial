import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map Plaid error codes to safe user-facing messages
const PLAID_ERROR_MESSAGES: Record<string, string> = {
  ITEM_LOGIN_REQUIRED: "Your bank connection needs re-authentication. Please re-link your account.",
  ACCESS_NOT_GRANTED: "Bank access was not granted. Please try linking again.",
  INSTITUTION_DOWN: "Your bank is temporarily unavailable. Please try again later.",
  INSTITUTION_NOT_RESPONDING: "Your bank is not responding. Please try again later.",
  ITEM_NOT_FOUND: "Bank connection not found. Please re-link your account.",
  PRODUCTS_NOT_READY: "Transaction data is still being prepared. Please try again in a few minutes.",
};

function getSafeErrorMessage(plaidError: any): string {
  if (plaidError?.error_code && PLAID_ERROR_MESSAGES[plaidError.error_code]) {
    return PLAID_ERROR_MESSAGES[plaidError.error_code];
  }
  return "Unable to fetch account data. Please try again later.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET");

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      console.error("Plaid credentials not configured");
      return new Response(JSON.stringify({ error: "Service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Use service role key to read access tokens — never expose them via user-scoped RLS
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: plaidItems, error: dbError } = await serviceSupabase
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
        // Force Plaid to refresh transactions from the bank
        try {
          await fetch("https://production.plaid.com/transactions/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token: item.plaid_access_token,
            }),
          });
        } catch (refreshErr) {
          console.error(`Refresh failed for ${item.institution_name}:`, refreshErr);
          // Continue even if refresh fails — we'll still get cached data
        }

        // Fetch transactions with pagination
        let offset = 0;
        let totalTransactions = Infinity;
        let itemTransactions: any[] = [];

        while (offset < totalTransactions) {
          const txRes = await fetch("https://production.plaid.com/transactions/get", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: PLAID_CLIENT_ID,
              secret: PLAID_SECRET,
              access_token: item.plaid_access_token,
              start_date: startDate,
              end_date: endDate,
              options: { count: 500, offset, include_personal_finance_category: true },
            }),
          });

          const txData = await txRes.json();

          if (!txRes.ok) {
            console.error(`Plaid error for ${item.institution_name}:`, JSON.stringify(txData));
            errors.push(`${item.institution_name}: ${getSafeErrorMessage(txData)}`);
            break;
          }

          itemTransactions = itemTransactions.concat(txData.transactions || []);
          totalTransactions = txData.total_transactions || 0;
          offset += (txData.transactions || []).length;

          // Map accounts only on first page
          if (offset <= 500 && txData.accounts) {
            for (const acct of txData.accounts) {
              allAccounts.push({
                account_id: acct.account_id,
                name: acct.name || acct.official_name || "Account",
                type: acct.type,
                subtype: acct.subtype,
                current_balance: acct.balances?.current ?? null,
                available_balance: acct.balances?.available ?? null,
                institution_name: item.institution_name,
                plaid_item_id: item.id,
              });
            }
          }

          // Safety: don't fetch more than 2000 transactions per item
          if (offset >= 2000) break;
        }

        allTransactions = allTransactions.concat(itemTransactions);
      } catch (err) {
        console.error(`Error fetching from ${item.institution_name}:`, err);
        errors.push(`${item.institution_name}: Unable to fetch account data.`);
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
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
