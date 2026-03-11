import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a sharp, warm, and direct personal financial advisor. You have access to a user's real transaction data and financial goals. Your job is to:

1. FLAG questionable or impulsive spending — be specific about the transaction, the amount, and what it costs them toward their goals. Never shame, just make the trade-off visible.
2. TRACK savings goals — calculate exact progress, project timelines, and celebrate wins.
3. ADVISE on debt — identify the most expensive debt first (avalanche method), give a concrete payoff plan.
4. RECOMMEND investments — based on their leftover cash flow, suggest specific next steps (emergency fund first, then 401k match, then Roth IRA, then brokerage).
5. SPOT patterns — recurring waste, seasonal spikes, lifestyle creep.
6. GIVE a net worth / cash flow snapshot — what's actually left over each month and where it should go.

Tone: Talk like a smart friend who happens to know finance cold. Direct, no fluff, no jargon unless you explain it. Use specific numbers from their data. End every analysis with a ranked action list — most impactful first.

When transactions are provided, always:
- Calculate total income vs total spending
- Identify top 5 spending categories
- Flag any single transaction over $100 that isn't rent/mortgage/utilities
- Calculate how much is "leaking" vs being saved intentionally
- Give a specific monthly savings/investment plan based on leftover cash

Format your response with clear sections using these exact headers:
💰 CASH FLOW SNAPSHOT
🚨 FLAGGED TRANSACTIONS
📈 SAVINGS & GOALS
💳 DEBT STRATEGY
🌱 INVESTMENT PLAN
✅ YOUR ACTION LIST (ranked by impact)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "No response generated.";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
