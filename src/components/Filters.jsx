import { PRIORITIES, STATUSES } from '../lib/supabase.js';

export default function Filters({
  priorityFilter,
  statusFilter,
  onPriorityChange,
  onStatusChange,
}) {
  return (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">עדיפות:</span>
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
            style={priorityFilter === p.value ? { borderColor: p.color, color: p.color } : undefined}
            onClick={() => onPriorityChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="filter-group">
        <span className="filter-label">סטטוס:</span>
        <button
          className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => onStatusChange('all')}
        >
          הכל
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            className={`chip ${statusFilter === s.value ? 'active' : ''}`}
            onClick={() => onStatusChange(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
