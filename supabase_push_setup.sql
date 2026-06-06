-- SQL commands to run in your Supabase SQL Editor to set up Push Notifications support.

-- 1. Create the push_subscriptions table
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.push_subscriptions enable row level security;

-- 3. Set up RLS Policies
-- Allow anyone to subscribe (handles both anonymous and authenticated users)
create policy "Allow insert access for all"
  on public.push_subscriptions for insert
  with check (true);

-- Allow users to manage (view/update/delete) their own subscriptions
create policy "Allow select access for owner"
  on public.push_subscriptions for select
  using (auth.uid() = user_id or user_id is null);

create policy "Allow update access for owner"
  on public.push_subscriptions for update
  using (auth.uid() = user_id or user_id is null);

create policy "Allow delete access for owner"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id or user_id is null);

-- 4. Set up an automatic trigger to update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.handle_updated_at();

-- Note for developers:
-- To send a push notification from your backend (e.g. Supabase Edge Functions or Node.js),
-- you would query this table for the user's subscription, and use the 'web-push' library
-- with your VAPID keys to send the payload.
--
-- Example Node.js push snippet:
-- const webpush = require('web-push');
-- webpush.setVapidDetails(
--   'mailto:your-email@example.com',
--   'BDd0rMTptcSWGYT3ubk6-pYI6JYdeDRfUZkR-xHWPvFXs7IzCvr53VrLKLOpPJI0BPKFKwqXzP13yS2ttR49NSA', // VAPID Public Key
--   'YOUR_VAPID_PRIVATE_KEY'
-- );
-- webpush.sendNotification(subscriptionObj, JSON.stringify({
--   title: 'Sober Alert!',
--   body: 'Your estimated BAC is now back to 0.00%. You are sober!'
-- }));
