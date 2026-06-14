ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS is_sober boolean default true;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- IMPORTANT: You MUST replace 'YOUR_PROJECT_REF' and 'YOUR_ANON_KEY' below
-- with your actual Supabase project reference and anon key for automated alerts to work!
-- Otherwise, the sober notifications will never be sent.
SELECT cron.schedule(
  'check-bac-alerts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-alerts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
