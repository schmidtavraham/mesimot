import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, PRIORITIES } from '../lib/supabase.js';

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5"  x2="12" y2="19" />
    <line x1="5"  y1="12" x2="19" y2="12" />
  </svg>
);

export default function TaskForm({ onAdd }) {
  const [isOpen, setIsOpen]     = useState(false);
  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy]         = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    setTitle('');
    setCategory(CATEGORIES[0].value);
    setPriority('medium');
  };

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    await onAdd({ title: trimmed, category, priority });
    setBusy(false);
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') close();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="add-task-btn"
        onClick={() => setIsOpen(true)}
      >
        <PlusIcon />
        <span>משימה חדשה</span>
      </button>
    );
  }

  return (
    <form className="task-form" onSubmit={submit} onKeyDown={onKeyDown}>
      <input
        ref={inputRef}
        className="task-input"
        type="text"
        placeholder="מה צריך לעשות?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={500}
        required
      />

      <div className="form-row">
        <span className="form-label">קטגוריה</span>
        <div className="form-chips">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.value}
              className={`chip-btn cat-${c.value} ${category === c.value ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <span className="form-label">עדיפות</span>
        <div className="form-chips">
          {PRIORITIES.map((p) => (
            <button
              type="button"
              key={p.value}
              className={`chip-btn priority-${p.value} ${priority === p.value ? 'active' : ''}`}
              onClick={() => setPriority(p.value)}
            >
              <span className="chip-btn-dot" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={close}>
          ביטול
        </button>
        <button type="submit" className="btn-submit" disabled={busy}>
          {busy ? 'מוסיף...' : 'הוספת משימה'}
        </button>
      </div>
    </form>
  );
}
