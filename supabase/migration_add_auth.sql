-- ============================================================
-- Mesimot - Migration: הוספת Auth
-- ============================================================
-- הרץ ב-Supabase SQL Editor
-- אחרי המיגרציה כל משימה תשויך למשתמש, ורק הוא יוכל לראותה.
-- ============================================================

-- 1) הוספת עמודת user_id (קישור ל-auth.users)
alter table public.tasks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) מחיקת משימות בדיקה ישנות שאין להן בעלים (היו פתוחות לכולם, עכשיו צריכות בעלים)
delete from public.tasks where user_id is null;

-- 3) הפיכת user_id לחובה
alter table public.tasks alter column user_id set not null;

-- 4) אינדקס על user_id
create index if not exists tasks_user_idx on public.tasks (user_id);

-- 5) החלפת המדיניות הפתוחה במדיניות מבוססת-משתמש
drop policy if exists "anon read tasks"   on public.tasks;
drop policy if exists "anon insert tasks" on public.tasks;
drop policy if exists "anon update tasks" on public.tasks;
drop policy if exists "anon delete tasks" on public.tasks;

create policy "users read own tasks"   on public.tasks
  for select using (auth.uid() = user_id);

create policy "users insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

create policy "users update own tasks" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);
