import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'חסרים משתני סביבה: VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY. צור קובץ .env לפי .env.example',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: globalThis.localStorage,
  },
});

export const CATEGORIES = [
  { value: 'work',     label: 'עבודה' },
  { value: 'home',     label: 'בית'   },
  { value: 'personal', label: 'אישי'  },
];

export const PRIORITIES = [
  { value: 'high',   label: 'גבוהה',  color: '#ef4444' },
  { value: 'medium', label: 'בינונית', color: '#f59e0b' },
  { value: 'low',    label: 'נמוכה',  color: '#10b981' },
];

export const STATUSES = [
  { value: 'open',        label: 'פתוח'    },
  { value: 'in_progress', label: 'בביצוע'  },
  { value: 'done',        label: 'הושלם'   },
];

export const labelOf = (list, value) =>
  list.find((x) => x.value === value)?.label ?? value;
