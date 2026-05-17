-- ============================================================
-- Mesimot - Migration: Automation reminders (webhook + push)
-- ============================================================
-- הרץ ב-Supabase SQL Editor.
-- מוסיף 3 טבלאות חדשות שלא נוגעות ב-tasks הקיים:
--   1) automation_tasks      - תזכורות מאוטומציות חיצוניות
--   2) push_subscriptions    - מנויי Web Push לפי משתמש/מכשיר
--   3) webhook_tokens        - טוקני Bearer לאימות ה-Edge Function
-- ============================================================

-- 1) טבלת משימות אוטומציה (נפרדת לחלוטין מ-tasks)
create table if not exists public.automation_tasks (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references auth.users(id) on delete cascade,

  source       text          not null,                              -- 'greenvest-facebook-weekly-draft'
  title        text          not null check (char_length(title) between 1 and 500),
  summary      text,
  priority     text          not null default 'normal'
                              check (priority in ('low', 'normal', 'high', 'urgent')),
  category     text          check (category in ('marketing', 'sales', 'installation', 'general') or category is null),

  context      jsonb         not null default '{}'::jsonb,          -- { automation_name, ran_at, what_happened, what_to_do }
  attachments  jsonb         not null default '[]'::jsonb,          -- [{ type, path|url, label }]
  actions      jsonb         not null default '[]'::jsonb,          -- [{ label, type, days? }]

  status       text          not null default 'open'
                              check (status in ('open', 'done', 'snoozed', 'dismissed')),
  snooze_until timestamptz,

  created_at   timestamptz   not null default now(),
  opened_at    timestamptz,
  completed_at timestamptz,
  updated_at   timestamptz   not null default now()
);

create index if not exists automation_tasks_user_idx       on public.automation_tasks (user_id);
create index if not exists automation_tasks_status_idx     on public.automation_tasks (user_id, status);
create index if not exists automation_tasks_created_idx    on public.automation_tasks (user_id, created_at desc);
create index if not exists automation_tasks_source_idx     on public.automation_tasks (user_id, source);
create index if not exists automation_tasks_snooze_idx     on public.automation_tasks (snooze_until)
  where status = 'snoozed';

-- updated_at trigger (משתמש בפונקציה הקיימת מ-schema.sql)
drop trigger if exists automation_tasks_set_updated_at on public.automation_tasks;
create trigger automation_tasks_set_updated_at
  before update on public.automation_tasks
  for each row execute function public.set_updated_at();

alter table public.automation_tasks enable row level security;

drop policy if exists "users read own automation_tasks"   on public.automation_tasks;
drop policy if exists "users update own automation_tasks" on public.automation_tasks;
drop policy if exists "users delete own automation_tasks" on public.automation_tasks;

create policy "users read own automation_tasks"   on public.automation_tasks
  for select using (auth.uid() = user_id);

create policy "users update own automation_tasks" on public.automation_tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own automation_tasks" on public.automation_tasks
  for delete using (auth.uid() = user_id);

-- INSERT רק דרך Edge Function עם service_role (אין policy ל-anon/authenticated insert)

alter publication supabase_realtime add table public.automation_tasks;

-- 2) Push subscriptions — מנוי לכל דפדפן/מכשיר של המשתמש
create table if not exists public.push_subscriptions (
  id           uuid          primary key default gen_random_uuid(),
  user_id      uuid          not null references auth.users(id) on delete cascade,
  endpoint     text          not null unique,
  p256dh       text          not null,
  auth         text          not null,
  user_agent   text,
  created_at   timestamptz   not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users read own subscriptions"   on public.push_subscriptions;
drop policy if exists "users insert own subscriptions" on public.push_subscriptions;
drop policy if exists "users delete own subscriptions" on public.push_subscriptions;

create policy "users read own subscriptions"   on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "users insert own subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "users delete own subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- 3) Webhook tokens — Bearer tokens (hashed) פר משתמש
create table if not exists public.webhook_tokens (
  id            uuid         primary key default gen_random_uuid(),
  user_id       uuid         not null references auth.users(id) on delete cascade,
  token_hash    text         not null unique,                        -- SHA256 של הטוקן
  token_prefix  text         not null,                                -- 8 תווים ראשונים להצגה
  label         text         not null,                                -- 'greenvest-marketing' / 'home-server'
  last_used_at  timestamptz,
  created_at    timestamptz  not null default now()
);

create index if not exists webhook_tokens_user_idx on public.webhook_tokens (user_id);

alter table public.webhook_tokens enable row level security;

drop policy if exists "users read own tokens"   on public.webhook_tokens;
drop policy if exists "users insert own tokens" on public.webhook_tokens;
drop policy if exists "users delete own tokens" on public.webhook_tokens;

create policy "users read own tokens"   on public.webhook_tokens
  for select using (auth.uid() = user_id);

create policy "users insert own tokens" on public.webhook_tokens
  for insert with check (auth.uid() = user_id);

create policy "users delete own tokens" on public.webhook_tokens
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 4) פונקציית עזר ב-DB: סטטוס "snoozed" שהזמן שלו עבר → 'open'
-- ============================================================
-- Edge Function או cron יקראו לזה. אפשר גם להפעיל בכניסה לאפליקציה.
create or replace function public.refresh_snoozed_automation_tasks()
returns integer
language plpgsql
security definer
as $$
declare
  affected integer;
begin
  update public.automation_tasks
  set status = 'open',
      snooze_until = null
  where status = 'snoozed'
    and snooze_until is not null
    and snooze_until <= now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;
