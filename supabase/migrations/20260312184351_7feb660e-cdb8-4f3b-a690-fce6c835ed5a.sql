-- Remove INSERT policy on plaid_items since inserts now use service role
DROP POLICY IF EXISTS "Users can insert their own plaid items" ON public.plaid_items;

-- Revoke INSERT on plaid_items from authenticated (service role bypasses RLS)
REVOKE INSERT ON public.plaid_items FROM authenticated;