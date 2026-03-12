-- Drop the existing broad SELECT policy that exposes plaid_access_token
DROP POLICY IF EXISTS "Users can view their own plaid items" ON public.plaid_items;

-- Create a restricted SELECT policy that only allows reading safe columns
-- We use column-level security via a view approach:
-- Revoke direct SELECT on the plaid_access_token column from anon and authenticated roles
REVOKE SELECT ON public.plaid_items FROM anon, authenticated;

-- Grant SELECT only on safe columns
GRANT SELECT (id, user_id, institution_name, plaid_item_id, created_at) ON public.plaid_items TO authenticated;

-- Re-create the SELECT policy scoped to the user
CREATE POLICY "Users can view own plaid items safe columns"
  ON public.plaid_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);