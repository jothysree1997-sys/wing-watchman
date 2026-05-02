
-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_iata TEXT NOT NULL,
  flight_number TEXT NOT NULL,
  flight_iata TEXT NOT NULL,
  dep_iata TEXT NOT NULL,
  arr_iata TEXT NOT NULL,
  dep_city TEXT,
  arr_city TEXT,
  dep_local_datetime TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  dep_time_utc TIMESTAMPTZ NOT NULL,
  arr_time_utc TIMESTAMPTZ,
  dep_estimated_utc TIMESTAMPTZ,
  arr_estimated_utc TIMESTAMPTZ,
  dep_actual_utc TIMESTAMPTZ,
  arr_actual_utc TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SUBSCRIBED',
  phase TEXT NOT NULL DEFAULT 'PENDING',
  api_call_count INT NOT NULL DEFAULT 0,
  failed_api_count INT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  last_response JSONB,
  last_status_text TEXT,
  next_job_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_status ON public.subscriptions(status);
CREATE INDEX idx_sub_dep ON public.subscriptions(dep_time_utc);

-- Scheduled jobs queue
CREATE TABLE public.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  phase TEXT,
  run_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  payload JSONB,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_due ON public.scheduled_jobs(status, run_at);
CREATE INDEX idx_jobs_sub ON public.scheduled_jobs(subscription_id);

-- API call logs
CREATE TABLE public.api_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.scheduled_jobs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'airlabs',
  endpoint TEXT NOT NULL,
  request_params JSONB,
  http_status INT,
  success BOOLEAN NOT NULL DEFAULT false,
  response JSONB,
  error TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_sub ON public.api_call_logs(subscription_id);
CREATE INDEX idx_logs_endpoint ON public.api_call_logs(endpoint, created_at);
CREATE INDEX idx_logs_created ON public.api_call_logs(created_at);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_subs_updated
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS — dummy login app, allow public access for demo
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.scheduled_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.api_call_logs FOR ALL USING (true) WITH CHECK (true);

-- pg_cron + pg_net for dispatcher
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
