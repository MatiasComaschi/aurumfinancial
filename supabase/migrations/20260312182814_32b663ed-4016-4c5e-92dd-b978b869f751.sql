-- Create a safe view excluding plaid_access_token
CREATE VIEW public.plaid_items_safe AS
SELECT id, user_id, plaid_item_id, institution_name, created_at
FROM public.plaid_items;

-- Enable RLS on the view
ALTER VIEW public.plaid_items_safe SET (security_invoker = on);

-- Revoke all direct SELECT on the base table from non-service roles
REVOKE SELECT ON public.plaid_items FROM anon, authenticated;

-- Grant SELECT on the safe view
GRANT SELECT ON public.plaid_items_safe TO authenticated;

-- Drop the old SELECT policy on base table (no longer needed for clients)
DROP POLICY IF EXISTS "Users can view own plaid items safe columns" ON public.plaid_items;

-- Add RLS-like policy: since security_invoker is on, the view respects base table RLS.
-- But we revoked SELECT, so we need a policy on the view. Views with security_invoker
-- use the caller's permissions on the base table. Since we revoked SELECT, we need
-- to grant it back but only through RLS. Let's use a different approach:
-- Re-grant SELECT on only safe columns and keep an RLS policy.
GRANT SELECT (id, user_id, plaid_item_id, institution_name, created_at) ON public.plaid_items TO authenticated;

CREATE POLICY "Users can view own plaid items via safe columns"
ON public.plaid_items
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);