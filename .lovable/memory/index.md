Personal AI financial advisor app "Aurum". Dark warm theme #1a1410 bg, gold #e8b86d accent.
Fonts: Fraunces (headings), DM Sans (body). No purple. Mobile-first 480px max.
AI: Anthropic claude-sonnet-4-20250514 via edge function `financial-advisor`. Key stored as ANTHROPIC_API_KEY secret. Do NOT use Lovable AI. max_tokens=2000.
Auth: Google OAuth (Lovable Cloud managed) + email/password via Supabase auth.
Plaid: PRODUCTION mode, edge functions `create-link-token`, `exchange-plaid-token`, `fetch-transactions`. Keys: PLAID_CLIENT_ID, PLAID_SECRET.
DB tables: profiles, plaid_items, goals (CRUD with linked accounts), bill_overrides (user bill prefs).
Transactions: Fetch 60 days from Plaid, show 30 in UI, feed 60 to AI/bill detection.
Balances: Pull from Plaid accounts response, display per-account cards on Overview.
Goals: Supabase-persisted, optional linked Plaid account for auto-balance, projected finish date.
Bills: Multi-signal detection (recurring+known merchant+consistent amount, need 2/3). User can override.
Claude prompt: Plain English rules — no jargon, friend-texting tone, specific amounts and trade-offs.
Tabs: Overview, Transactions, Advice, Ask. No mock data — all real from Plaid/Supabase.
Category colors defined as CSS vars and tailwind `cat-*` tokens.
