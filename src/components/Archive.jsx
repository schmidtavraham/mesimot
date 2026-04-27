import { CATEGORIES, PRIORITIES, labelOf } from '../lib/supabase.js';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '';
  }
};

const RestoreIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 4 3 10 9 10" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6"  x2="6"  y2="18" />
    <line x1="6"  y1="6"  x2="18" y2="18" />
  </svg>
);

export default function Archive({ tasks, onClose, onRestore, onDelete }) {
  const handleDelete = (task) => {
    if (window.confirm(`למחוק לצמיתות את "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="modal-header">
          <div>
            <h2>ארכיון</h2>
            <p className="modal-sub">משימות שהושלמו ({tasks.length})</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="סגירה"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="modal-body">
          {tasks.length === 0 ? (
            <p className="archive-empty">אין משימות בארכיון.</p>
          ) : (
            <ul className="archive-list">
              {tasks.map((t) => (
                <li key={t.id} className="archive-item">
                  <div className="archive-info">
                    <div className="archive-title">{t.title}</div>
                    <div className="archive-meta">
                      <span className={`mini-tag cat-${t.category}`}>
                        {labelOf(CATEGORIES, t.category)}
                      </span>
                      <span className={`mini-tag priority-${t.priority}`}>
                        {labelOf(PRIORITIES, t.priority)}
                      </span>
                      <span className="archive-date">{formatDate(t.updated_at ?? t.created_at)}</span>
                    </div>
                  </div>

                  <div className="archive-actions">
                    <button
                      type="button"
                      className="archive-btn restore"
                      onClick={() => onRestore(t.id)}
                      title="החזר לפעיל"
                    >
                      <RestoreIcon />
                      <span>שחזור</span>
                    </button>
                    <button
                      type="button"
                      className="archive-btn delete"
                      onClick={() => handleDelete(t)}
                      title="מחק לצמיתות"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
