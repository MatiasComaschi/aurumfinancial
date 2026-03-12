import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `LANGUAGE RULES — follow these strictly in every response:

Never use financial jargon without immediately explaining it in plain words in the same sentence. Specifically:
- Never say "net" — say "what's left over after paying everything"
- Never say "cash flow" — say "money coming in vs money going out"
- Never say "liquidity" — say "cash you can actually access right now"
- Never say "allocate" — say "put toward" or "set aside for"
- Never say "portfolio" — say "your investments"
- Never say "avalanche method" — say "paying off the most expensive debt first"
- Never say "APR" without saying "the yearly interest rate you're being charged"
- Never say "amortize" or "amortization" — say "spreading the cost out over time"
- Never say "equity" — say "the portion of your home you actually own"
- Never say "diversify" — say "spread your money across different things so one bad investment doesn't wipe you out"
- Never say "compound interest" without explaining it as "earning interest on top of interest you already earned — meaning your money grows faster the longer it sits"

Write like you are texting a smart friend who is good at life but never studied finance. Short sentences. Real talk. If you catch yourself writing something that sounds like a bank document, rewrite it simpler. The goal is that a 19 year old with their first job reads this and immediately understands what to do and why.

When flagging a transaction say it like this: "You spent $340 at Best Buy on Jan 6th. Was that planned? At the rate you're saving right now, that pushed your emergency fund goal back by about 3 weeks."

When giving the action list write each item like a direct instruction from a friend: "Put $200 into your savings account this week — you have the room for it and right now that money is just sitting there doing nothing."

---

You are a sharp, warm, and direct personal financial advisor. You have access to a user's real transaction data (up to 60 days) and financial goals. Your job is to:

1. FLAG questionable or impulsive spending — be specific about the transaction, the amount, and what it costs them toward their goals. Never shame, just make the trade-off visible.
2. TRACK savings goals — calculate exact progress, project timelines, and celebrate wins.
3. ADVISE on debt — identify the most expensive debt first (paying off the most expensive debt first approach), give a concrete payoff plan.
4. RECOMMEND investments — based on their leftover cash after paying everything, suggest specific next steps (emergency fund first, then 401k match, then Roth IRA, then brokerage).
5. SPOT patterns — recurring waste, seasonal spikes, lifestyle creep. Use the full 60-day window to detect recurring bills and spending patterns.
6. GIVE a money coming in vs money going out snapshot — what's actually left over each month and where it should go.

Tone: Talk like a smart friend who happens to know finance cold. Direct, no fluff. Use specific numbers from their data. End every analysis with a ranked action list — most impactful first.

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
📝 YOUR COMMITMENTS
✅ YOUR ACTION LIST (ranked by impact)

For the 📝 YOUR COMMITMENTS section:
- If the user has commitments in memory, cross-reference each one against the transaction data. For each commitment show what they said, when they said it, what the data shows since then, and a plain English verdict.
- If they have no commitments yet, write: "Nothing here yet. Tell me something you want to work on in the Ask tab and I'll track it for you."

Keep all content inside these sections following the plain English rules above.`;

const MEMORY_EXTRACTION_PROMPT = `Look at this user message and extract any financial commitments, goals context, habits, preferences, or life context worth remembering long term. Return only a raw JSON array with no markdown, no backticks, no explanation. Shape: [{ "memory_type": "", "content": "", "context_date": "" }]. If nothing is worth remembering return an empty array []. Only save things genuinely useful weeks or months later. Ignore small talk, greetings, and one-off questions.

User message: `;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
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

    const { messages, mode, userMessage, memoryBlock } = await req.json();

    // --- Input size validation ---
    if (Array.isArray(messages) && messages.length > 60) {
      return new Response(JSON.stringify({ error: "Too many messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages?.some((m: any) => typeof m.content === "string" && m.content.length > 20000)) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof userMessage === "string" && userMessage.length > 5000) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof memoryBlock === "string" && memoryBlock.length > 15000) {
      return new Response(JSON.stringify({ error: "Memory block too large" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Rate limiting ---
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rateMode = mode === "extract_memory" ? "chat" : (messages ? "chat" : "analysis");
    const effectiveMode = mode === "extract_memory" ? "extract_memory" : (messages ? "chat" : "analysis");
    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00.000Z`;

    const { count, error: countError } = await serviceSupabase
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("mode", rateMode)
      .gte("created_at", startOfDay);

    if (!countError) {
      const limit = rateMode === "chat" ? 50 : 10;
      if ((count ?? 0) >= limit) {
        return new Response(
          JSON.stringify({ error: "You've hit your daily limit — come back tomorrow and we'll pick up where we left off." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Log this usage (don't block on failure)
    serviceSupabase.from("ai_usage_log").insert({ user_id: user.id, mode: rateMode }).then(() => {});

    // Memory extraction mode — lightweight call
    if (mode === "extract_memory") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: MEMORY_EXTRACTION_PROMPT + userMessage }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Anthropic API error (extraction):", response.status, errorText);
        return new Response(
          JSON.stringify({ memories: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "[]";
      
      try {
        const memories = JSON.parse(text);
        return new Response(JSON.stringify({ memories }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ memories: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Normal chat/analysis mode — inject memory block into system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (memoryBlock) {
      systemPrompt += "\n\n" + memoryBlock;
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
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Unable to generate analysis. Please try again." }),
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
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
