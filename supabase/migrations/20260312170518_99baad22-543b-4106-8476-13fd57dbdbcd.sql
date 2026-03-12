ALTER TABLE public.goals DROP CONSTRAINT goals_linked_account_id_fkey;
ALTER TABLE public.goals ALTER COLUMN linked_account_id TYPE text;