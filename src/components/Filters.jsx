import { PRIORITIES } from '../lib/supabase.js';

const ACTIVE_STATUSES = [
  { value: 'open',        label: 'פתוח'   },
  { value: 'in_progress', label: 'בביצוע' },
];

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6"  x2="6"  y2="18" />
    <line x1="6"  y1="6"  x2="18" y2="18" />
  </svg>
);

export default function Filters({
  open,
  priorityFilter,
  statusFilter,
  onPriorityChange,
  onStatusChange,
  onClose,
}) {
  const reset = () => {
    onPriorityChange('all');
    onStatusChange('all');
  };

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="סינון"
      >
        <header className="drawer-header">
          <h2>סינון</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="סגירה"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="drawer-body">
          <section className="drawer-section">
            <h3>עדיפות</h3>
            <div className="drawer-chips">
              <button
                className={`chip ${priorityFilter === 'all' ? 'active' : ''}`}
                onClick={() => onPriorityChange('all')}
              >
                הכל
              </button>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  className={`chip ${priorityFilter === p.value ? 'active' : ''}`}
                  style={priorityFilter === p.value
                    ? { background: p.color, borderColor: p.color, color: '#fff' }
                    : undefined}
                  onClick={() => onPriorityChange(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="drawer-section">
            <h3>סטטוס</h3>
            <div className="drawer-chips">
              <button
                className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => onStatusChange('all')}
              >
                הכל
              </button>
              {ACTIVE_STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`chip ${statusFilter === s.value ? 'active' : ''}`}
                  onClick={() => onStatusChange(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <button type="button" className="drawer-reset" onClick={reset}>
            איפוס סינון
          </button>
        </div>
      </aside>
    </div>
  );
}
