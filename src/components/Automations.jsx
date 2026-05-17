import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  listAutomationTasks,
  completeTask,
  snoozeTask,
  dismissTask,
  reopenTask,
  deleteTask,
  markOpened,
  AUTOMATION_CATEGORIES,
  AUTOMATION_STATUSES,
  categoryLabel,
} from '../lib/automations.js';
import AutomationCard from './AutomationCard.jsx';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6"  y2="18" />
    <line x1="6"  y1="6" x2="18" y2="18" />
  </svg>
);

export default function Automations({ userId, onClose, onCountChange }) {
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const [statusFilter,   setStatusFilter]   = useState('open');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter,   setSourceFilter]   = useState('all');

  const refresh = async () => {
    try {
      const data = await listAutomationTasks(userId);
      setTasks(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    refresh();
    const channel = supabase
      .channel('automation-tasks-modal')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'automation_tasks', filter: `user_id=eq.${userId}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Mark all open+unopened tasks as opened once the modal is shown
  useEffect(() => {
    if (loading) return;
    tasks
      .filter((t) => t.status === 'open' && !t.opened_at)
      .forEach((t) => { markOpened(t.id); });
  }, [loading, tasks]);

  const sources = useMemo(() => {
    const set = new Set(tasks.map((t) => t.source));
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter   !== 'all' && t.status   !== statusFilter)   return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (sourceFilter   !== 'all' && t.source   !== sourceFilter)   return false;
      return true;
    });
  }, [tasks, statusFilter, categoryFilter, sourceFilter]);

  const countByStatus = useMemo(() => {
    const m = { all: tasks.length, open: 0, snoozed: 0, done: 0, dismissed: 0 };
    for (const t of tasks) m[t.status] = (m[t.status] ?? 0) + 1;
    return m;
  }, [tasks]);

  // Push the unread count up to App.jsx
  useEffect(() => {
    onCountChange?.(countByStatus.open);
  }, [countByStatus.open, onCountChange]);

  const handlers = {
    onComplete: (id) => completeTask(id).catch((e) => setError(e.message)),
    onSnooze:   (id, days) => snoozeTask(id, days).catch((e) => setError(e.message)),
    onDismiss:  (id) => dismissTask(id).catch((e) => setError(e.message)),
    onReopen:   (id) => reopenTask(id).catch((e) => setError(e.message)),
    onDelete:   (id) => {
      if (window.confirm('למחוק לצמיתות?')) {
        deleteTask(id).catch((e) => setError(e.message));
      }
    },
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal auto-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="modal-header">
          <div>
            <h2>אוטומציות</h2>
            <p className="modal-sub">
              {countByStatus.open} פתוחות · {countByStatus.snoozed} נדחו · {countByStatus.done} הושלמו
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="סגירה">
            <CloseIcon />
          </button>
        </header>

        <div className="auto-toolbar">
          <div className="auto-toolbar-group">
            {AUTOMATION_STATUSES.map((s) => (
              <button key={s.value} type="button"
                      className={`chip ${statusFilter === s.value ? 'active' : ''}`}
                      onClick={() => setStatusFilter(s.value)}>
                {s.label} <span className="chip-count">{countByStatus[s.value] ?? 0}</span>
              </button>
            ))}
            <button type="button"
                    className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}>
              הכל <span className="chip-count">{countByStatus.all}</span>
            </button>
          </div>

          <div className="auto-toolbar-group">
            <label className="auto-toolbar-label">קטגוריה:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">הכל</option>
              {AUTOMATION_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {sources.length > 1 && (
            <div className="auto-toolbar-group">
              <label className="auto-toolbar-label">מקור:</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="all">הכל</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="modal-body">
          {error && <div className="banner error">שגיאה: {error}</div>}

          {loading ? (
            <p className="loading">טוען...</p>
          ) : filtered.length === 0 ? (
            <p className="archive-empty">
              {statusFilter === 'open'
                ? 'אין משימות פתוחות 🎉'
                : 'אין משימות בסינון הזה.'}
            </p>
          ) : (
            <div className="auto-list">
              {filtered.map((t) => (
                <AutomationCard key={t.id} task={t} {...handlers} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
