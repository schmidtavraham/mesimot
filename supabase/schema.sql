-- ============================================================
-- Mesimot (משימות) - Supabase schema
-- ============================================================
-- הרץ את כל הקובץ הזה ב-Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> הדבק -> Run)
-- ============================================================

-- 1) טבלת המשימות
create table if not exists public.tasks (
  id           uuid          primary key default gen_random_uuid(),
  title        text          not null check (char_length(title) between 1 and 500),
  category     text          not null check (category in ('work', 'home', 'personal')),
  priority     text          not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status       text          not null default 'open'   check (status   in ('open', 'in_progress', 'done')),
  source       text          not null default 'web'    check (source   in ('web', 'telegram')),
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

-- 2) אינדקסים לסינון מהיר
create index if not exists tasks_category_idx  on public.tasks (category);
create index if not exists tasks_priority_idx  on public.tasks (priority);
create index if not exists tasks_status_idx    on public.tasks (status);
create index if not exists tasks_created_idx   on public.tasks (created_at desc);

-- 3) טריגר לעדכון updated_at אוטומטית
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- 4) הפעלת Row Level Security
alter table public.tasks enable row level security;

-- 5) מדיניות פתוחה ל-anon (אפליקציה חד-משתמשית, ללא Auth)
-- אם תרצה אבטחה אמיתית בעתיד - הוסף Supabase Auth ועדכן את המדיניות
drop policy if exists "anon read tasks"   on public.tasks;
drop policy if exists "anon insert tasks" on public.tasks;
drop policy if exists "anon update tasks" on public.tasks;
drop policy if exists "anon delete tasks" on public.tasks;

create policy "anon read tasks"   on public.tasks for select using (true);
create policy "anon insert tasks" on public.tasks for insert with check (true);
create policy "anon update tasks" on public.tasks for update using (true) with check (true);
create policy "anon delete tasks" on public.tasks for delete using (true);

-- 6) הפעלת Realtime על הטבלה (כדי שהאפליקציה תתעדכן מיד כשהבוט יוסיף משימה)
alter publication supabase_realtime add table public.tasks;
