// Helpers for fetching + mutating automation_tasks rows from the browser.

import { supabase } from './supabase.js';

export const AUTOMATION_CATEGORIES = [
  { value: 'marketing',    label: 'שיווק' },
  { value: 'sales',        label: 'מכירות' },
  { value: 'installation', label: 'התקנות' },
  { value: 'general',      label: 'כללי' },
];

export const AUTOMATION_PRIORITIES = [
  { value: 'urgent', label: 'דחוף',   color: '#dc2626' },
  { value: 'high',   label: 'גבוהה',  color: '#ef4444' },
  { value: 'normal', label: 'רגילה',  color: '#3b82f6' },
  { value: 'low',    label: 'נמוכה',  color: '#10b981' },
];

export const AUTOMATION_STATUSES = [
  { value: 'open',      label: 'פתוח' },
  { value: 'snoozed',   label: 'נדחה' },
  { value: 'done',      label: 'הושלם' },
  { value: 'dismissed', label: 'בוטל' },
];

export const categoryLabel = (v) =>
  AUTOMATION_CATEGORIES.find((c) => c.value === v)?.label ?? v ?? 'ללא קטגוריה';

export const priorityMeta = (v) =>
  AUTOMATION_PRIORITIES.find((p) => p.value === v) ?? AUTOMATION_PRIORITIES[2];

export async function refreshSnoozed() {
  // Optional — keeps "snoozed" rows that expired moving back to "open".
  // Safe to call on app load.
  try {
    await supabase.rpc('refresh_snoozed_automation_tasks');
  } catch {}
}

export async function listAutomationTasks(userId) {
  await refreshSnoozed();
  const { data, error } = await supabase
    .from('automation_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function completeTask(id) {
  const { error } = await supabase
    .from('automation_tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function dismissTask(id) {
  const { error } = await supabase
    .from('automation_tasks')
    .update({ status: 'dismissed' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function snoozeTask(id, days) {
  const safeDays = Math.max(1, Math.min(30, Number(days) || 1));
  const until = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from('automation_tasks')
    .update({ status: 'snoozed', snooze_until: until.toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function reopenTask(id) {
  const { error } = await supabase
    .from('automation_tasks')
    .update({ status: 'open', snooze_until: null, completed_at: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTask(id) {
  const { error } = await supabase
    .from('automation_tasks')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markOpened(id) {
  // Only update if not already opened — avoid noisy updates.
  await supabase
    .from('automation_tasks')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', id)
    .is('opened_at', null);
}
