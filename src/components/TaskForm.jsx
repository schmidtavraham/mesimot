import { useState } from 'react';
import { CATEGORIES, PRIORITIES } from '../lib/supabase.js';

export default function TaskForm({ onAdd }) {
  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [priority, setPriority] = useState('medium');
  const [busy, setBusy]         = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    await onAdd({ title: trimmed, category, priority });
    setTitle('');
    setBusy(false);
  };

  return (
    <form className="task-form" onSubmit={submit}>
      <input
        className="task-input"
        type="text"
        placeholder="כתוב משימה חדשה..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={500}
        required
      />
      <select
        className="task-select"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <select
        className="task-select"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <button className="task-submit" type="submit" disabled={busy}>
        {busy ? 'מוסיף...' : 'הוספה'}
      </button>
    </form>
  );
}
