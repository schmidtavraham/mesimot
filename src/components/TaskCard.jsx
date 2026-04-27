import { useState } from 'react';
import { PRIORITIES, labelOf } from '../lib/supabase.js';

const PRIORITY_ORDER = ['high', 'medium', 'low'];

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit',
    });
  } catch {
    return '';
  }
};

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
       stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 12 10 17 19 7" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4" />
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

const GripIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <circle cx="9"  cy="6"  r="1.6" />
    <circle cx="15" cy="6"  r="1.6" />
    <circle cx="9"  cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9"  cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

export default function TaskCard({
  task,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDropOn,
  isDragging,
  canDrop,
}) {
  const [hoverPos, setHoverPos] = useState(null); // 'before' | 'after' | null

  const isDone       = task.status === 'done';
  const isInProgress = task.status === 'in_progress';

  const toggleDone = () => {
    onUpdate(task.id, { status: isDone ? 'open' : 'done' });
  };

  const toggleInProgress = () => {
    onUpdate(task.id, { status: isInProgress ? 'open' : 'in_progress' });
  };

  const cyclePriority = () => {
    const idx  = PRIORITY_ORDER.indexOf(task.priority);
    const next = PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
    onUpdate(task.id, { priority: next });
  };

  const handleDelete = () => {
    if (window.confirm(`למחוק את "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    onDragStart?.(task);
  };

  const handleDragOver = (e) => {
    if (!canDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setHoverPos(e.clientY < midY ? 'before' : 'after');
  };

  const handleDragLeave = () => setHoverPos(null);

  const handleDrop = (e) => {
    if (!canDrop) return;
    e.preventDefault();
    onDropOn?.(task, hoverPos ?? 'after');
    setHoverPos(null);
  };

  return (
    <li
      className={`task-card ${isDone ? 'is-done' : ''} ${isInProgress ? 'is-progress' : ''} ${isDragging ? 'is-dragging' : ''} ${hoverPos ? `drop-${hoverPos}` : ''}`}
      draggable={!isDone}
      onDragStart={handleDragStart}
      onDragEnd={() => { setHoverPos(null); onDragEnd?.(); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="drag-handle" aria-hidden="true"><GripIcon /></span>

      <button
        type="button"
        className={`task-check ${isDone ? 'checked' : ''}`}
        onClick={toggleDone}
        aria-label={isDone ? 'סמן כפתוח' : 'סמן כהושלם'}
        title={isDone ? 'בטל סימון' : 'סמן כהושלם'}
      >
        {isDone && <CheckIcon />}
      </button>

      <div className="task-body">
        <div className="task-title">{task.title}</div>

        <div className="task-meta">
          <button
            type="button"
            className={`chip priority priority-${task.priority}`}
            onClick={cyclePriority}
            title="לחץ לשינוי עדיפות"
          >
            <span className="chip-dot" />
            {labelOf(PRIORITIES, task.priority)}
          </button>

          {!isDone && (
            <button
              type="button"
              className={`chip progress ${isInProgress ? 'active' : ''}`}
              onClick={toggleInProgress}
              title={isInProgress ? 'הפסק עבודה' : 'התחל עבודה'}
            >
              <PlayIcon />
              {isInProgress ? 'בביצוע' : 'התחל'}
            </button>
          )}

          <span className="task-date">{formatDate(task.created_at)}</span>

          {task.source === 'telegram' && (
            <span className="task-source">טלגרם</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="task-delete"
        onClick={handleDelete}
        aria-label="מחק משימה"
        title="מחק"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
