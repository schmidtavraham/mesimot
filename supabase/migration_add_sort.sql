-- ============================================================
-- Mesimot - Migration: הוספת מיון ידני (drag & drop)
-- ============================================================
-- הרץ ב-Supabase SQL Editor
-- ============================================================

-- 1) עמודת מיון ידני (גבוה יותר = גבוה יותר ברשימה)
alter table public.tasks
  add column if not exists sort_order double precision;

-- 2) הקצאת ערך התחלתי למשימות קיימות (לפי תאריך יצירה)
update public.tasks
set sort_order = extract(epoch from created_at)
where sort_order is null;

-- 3) הפיכת העמודה לחובה
alter table public.tasks
  alter column sort_order set not null;

-- 4) אינדקס למיון מהיר
create index if not exists tasks_sort_idx
  on public.tasks (user_id, sort_order desc);
