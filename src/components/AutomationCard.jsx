import { useState } from 'react';
import {
  categoryLabel,
  priorityMeta,
  AUTOMATION_PRIORITIES,
} from '../lib/automations.js';

const formatDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatRelative = (iso) => {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1)     return 'עכשיו';
    if (m < 60)    return `לפני ${m} דק׳`;
    if (m < 1440)  return `לפני ${Math.round(m / 60)} שעות`;
    return `לפני ${Math.round(m / 1440)} ימים`;
  } catch { return ''; }
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12 10 17 19 7" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6"  y2="18" />
    <line x1="6"  y1="6" x2="18" y2="18" />
  </svg>
);

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5l-9.5 9.5a5 5 0 0 1-7-7l10-10a3.5 3.5 0 0 1 5 5l-10 10a2 2 0 0 1-3-3l9-9" />
  </svg>
);

const SNOOZE_OPTIONS = [
  { days: 1,  label: 'מחר' },
  { days: 3,  label: '3 ימים' },
  { days: 7,  label: 'שבוע' },
];

export default function AutomationCard({ task, onComplete, onSnooze, onDismiss, onReopen, onDelete }) {
  const [showSnooze, setShowSnooze] = useState(false);

  const isOpen      = task.status === 'open';
  const isSnoozed   = task.status === 'snoozed';
  const isDone      = task.status === 'done';
  const isDismissed = task.status === 'dismissed';

  const ctx = task.context ?? {};
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];
  const priority = priorityMeta(task.priority);

  const handleSnoozePick = (days) => {
    setShowSnooze(false);
    onSnooze(task.id, days);
  };

  return (
    <article className={`auto-card status-${task.status}`}>
      <header className="auto-card-head">
        <div className="auto-card-source">
          <span className="auto-source-dot" style={{ background: priority.color }} />
          <span className="auto-source-text">{task.source}</span>
          {task.category && (
            <span className="auto-cat">{categoryLabel(task.category)}</span>
          )}
        </div>
        <div className="auto-card-meta">
          <span className="auto-time" title={formatDateTime(task.created_at)}>
            {formatRelative(task.created_at)}
          </span>
        </div>
      </header>

      <h3 className="auto-title">{task.title}</h3>
      {task.summary && <p className="auto-summary">{task.summary}</p>}

      {(ctx.what_happened || ctx.what_to_do) && (
        <div className="auto-context">
          {ctx.what_happened && (
            <div className="auto-context-block">
              <span className="auto-context-label">מה קרה</span>
              <span className="auto-context-text">{String(ctx.what_happened)}</span>
            </div>
          )}
          {ctx.what_to_do && (
            <div className="auto-context-block">
              <span className="auto-context-label">צעד הבא</span>
              <span className="auto-context-text">{String(ctx.what_to_do)}</span>
            </div>
          )}
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="auto-attachments">
          {attachments.map((a, i) => {
            const href = a.url ?? (a.path ? `file:///${String(a.path).replace(/\\/g, '/')}` : null);
            const label = a.label ?? a.path ?? a.url ?? `קובץ ${i + 1}`;
            return (
              <li key={i}>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    <PaperclipIcon />
                    <span>{label}</span>
                  </a>
                ) : (
                  <span><PaperclipIcon /> {label}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isSnoozed && task.snooze_until && (
        <div className="auto-snooze-info">
          <ClockIcon />
          <span>נדחה עד {formatDateTime(task.snooze_until)}</span>
        </div>
      )}

      <footer className="auto-card-actions">
        {isOpen && (
          <>
            <button type="button" className="auto-btn primary" onClick={() => onComplete(task.id)}>
              <CheckIcon /> סמן כהושלם
            </button>

            {showSnooze ? (
              <div className="auto-snooze-picker">
                {SNOOZE_OPTIONS.map((opt) => (
                  <button key={opt.days} type="button"
                          className="auto-btn ghost"
                          onClick={() => handleSnoozePick(opt.days)}>
                    {opt.label}
                  </button>
                ))}
                <button type="button" className="auto-btn ghost"
                        onClick={() => setShowSnooze(false)}>
                  ביטול
                </button>
              </div>
            ) : (
              <button type="button" className="auto-btn ghost" onClick={() => setShowSnooze(true)}>
                <ClockIcon /> דחה
              </button>
            )}

            <button type="button" className="auto-btn ghost danger" onClick={() => onDismiss(task.id)}>
              <XIcon /> בטל
            </button>
          </>
        )}

        {(isSnoozed || isDone || isDismissed) && (
          <>
            <button type="button" className="auto-btn ghost" onClick={() => onReopen(task.id)}>
              החזר לפעיל
            </button>
            <button type="button" className="auto-btn ghost danger" onClick={() => onDelete(task.id)}>
              מחק לצמיתות
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
