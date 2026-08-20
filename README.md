# Gold Standard Advisor

Build a personal AI financial advisor app. Here is the full spec:

STACK React + Tailwind. Single page app, mobile-first (max-width 480px centered).

DATA Integrate Plaid to fetch the user's real bank transactions. Store transactions in state. Also store a goals array with objects shaped like { id, name, target, current }.

DESIGN Warm, approachable, dark theme. Background #1a1410. Accent color #e8b86d (gold). Use Google Fonts: Fraunces (serif, for headings and numbers) + DM Sans (for body). Feel like a smart friend, not a bank. No purple gradients, no generic fintech look.

LAYOUT Four tabs: Overview, Transactions, Advice, Ask.

Overview tab: Shows 3 quick stat cards at top (Income, Spent, Net — color coded green/red/gold). Below that, goal progress bars for each goal. Below that, top spending categories as horizontal bar chart. At bottom, a prominent gold CTA button "✦ Analyze My Finances" that triggers the AI analysis.

Transactions tab: Scrollable list of all transactions. Each row shows merchant name, date, category, and amount (green for income, white for expense). Color-coded dot per category.

Advice tab: Displays Claude's analysis broken into cards. Each card is one section. Shows a loading spinner while waiting. If no analysis run yet, shows empty state.

Ask tab: Chat interface. User types a question, hits enter or send button. Messages bubble left (Claude) and right (user). Input pinned to bottom.

AI INTEGRATION — CRITICAL All AI calls go to the Anthropic API endpoint: https://api.anthropic.com/v1/messages

Use model: claude-sonnet-4-20250514 Max tokens: 1000 Handle the API key securely server-side (Supabase edge function or similar).

Every API call must include this exact system prompt:

You are a sharp, warm, and direct personal financial advisor. You have access to a user's real transaction data and financial goals. Your job is to:

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
✅ YOUR ACTION LIST (ranked by impact)

For the Analyze button, send this user message to Claude:

Here are my transactions for this month:
[format each as: DATE | MERCHANT | $AMOUNT | CATEGORY]

My financial goals:
[format each as: GOAL NAME: $current saved of $target goal]

Please give me a full financial analysis and advisor report.

For the Ask tab chat, on every message include the full transaction data and goals as context in the first turn, then maintain conversation history across turns like this:

messages: [
  { role: "user", content: "My transaction data: [full list]. My goals: [goals list]" },
  { role: "assistant", content: "Got it, I have your full financial picture. Ask me anything." },
  ...actual chat history...
]

Parse Claude's response by splitting on the section headers (💰, 🚨, 📈, 💳, 🌱, ✅) and render each section as its own card in the Advice tab.

CATEGORY COLORS (dot indicators and bar charts): Income: #4ade80, Housing: #fb923c, Groceries: #a78bfa, Subscriptions: #38bdf8, Shopping: #f472b6, Dining: #fbbf24, Transportation: #94a3b8, Health: #34d399, Debt: #f87171, Utilities: #60a5fa, Insurance: #c084fc, Savings: #4ade80, Misc: #9ca3af

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aurumfinancial.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7b9ef36a-4d20-4e79-820b-bd1563e664da).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
