import { PRIORITIES, STATUSES, labelOf } from '../lib/supabase.js';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '';
  }
};

export default function TaskCard({ task, onUpdate, onDelete }) {
  const priorityColor =
    PRIORITIES.find((p) => p.value === task.priority)?.color ?? '#999';

  return (
    <li className={`task-card ${task.status === 'done' ? 'done' : ''}`}>
      <div className="task-priority-bar" style={{ background: priorityColor }} />

      <div className="task-body">
        <div className="task-title">{task.title}</div>

        <div className="task-meta">
          <span className="task-date">{formatDate(task.created_at)}</span>
          {task.source === 'telegram' && <span className="task-source">טלגרם</span>}
        </div>

        <div className="task-controls">
          <select
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value })}
            aria-label="עדיפות"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            value={task.status}
            onChange={(e) => onUpdate(task.id, { status: e.target.value })}
            aria-label="סטטוס"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            className="task-delete"
            onClick={() => onDelete(task.id)}
            title="מחק"
            aria-label="מחיקת משימה"
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}
