
-- Revoke ALL privileges on plaid_items from client roles
REVOKE ALL ON public.plaid_items FROM anon, authenticated;

-- Drop the existing SELECT policy that exposes all columns
DROP POLICY IF EXISTS "Authenticated users can select own safe columns" ON public.plaid_items;

-- Grant column-level SELECT on ONLY safe columns (needed for security_invoker view)
GRANT SELECT (id, user_id, plaid_item_id, institution_name, created_at) ON public.plaid_items TO authenticated;

-- Recreate a SELECT policy scoped to own rows (required for column-level grant to work with RLS)
CREATE POLICY "Select own safe columns only"
ON public.plaid_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
