CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ai_usage_log_user_date ON public.ai_usage_log (user_id, created_at);

-- No client access needed; only service role reads/writes this table
