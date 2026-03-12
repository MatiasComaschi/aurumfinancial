-- Fully revoke SELECT on plaid_items base table (including column-level grants)
REVOKE ALL ON public.plaid_items FROM anon, authenticated;

-- Drop the existing SELECT policy on base table
DROP POLICY IF EXISTS "Users can view own plaid items via safe columns" ON public.plaid_items;

-- Fix INSERT and DELETE policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can insert their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can delete their own plaid items" ON public.plaid_items;

CREATE POLICY "Users can insert their own plaid items"
ON public.plaid_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plaid items"
ON public.plaid_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix the plaid_items_safe view: recreate as security invoker with WHERE clause
DROP VIEW IF EXISTS public.plaid_items_safe;

CREATE VIEW public.plaid_items_safe
WITH (security_invoker = on)
AS SELECT id, user_id, plaid_item_id, institution_name, created_at
FROM public.plaid_items
WHERE auth.uid() = user_id;

-- Grant SELECT on the safe view only
GRANT SELECT ON public.plaid_items_safe TO authenticated;

-- Need a SELECT policy on base table for the security_invoker view to work
-- but ONLY grant SELECT on safe columns
GRANT SELECT (id, user_id, plaid_item_id, institution_name, created_at) ON public.plaid_items TO authenticated;

CREATE POLICY "Authenticated users can select own safe columns"
ON public.plaid_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);