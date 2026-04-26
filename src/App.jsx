import { useEffect, useMemo, useState } from 'react';
import { supabase, CATEGORIES } from './lib/supabase.js';
import TaskForm from './components/TaskForm.jsx';
import Filters from './components/Filters.jsx';
import CategoryColumn from './components/CategoryColumn.jsx';
import './App.css';

export default function App() {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setTasks(data ?? []);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addTask = async ({ title, category, priority }) => {
    const { error } = await supabase
      .from('tasks')
      .insert({ title, category, priority, status: 'open', source: 'web' });
    if (error) setError(error.message);
  };

  const updateTask = async (id, patch) => {
    const { error } = await supabase.from('tasks').update(patch).eq('id', id);
    if (error) setError(error.message);
  };

  const deleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) setError(error.message);
  };

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter   !== 'all' && t.status   !== statusFilter)   return false;
      return true;
    });
  }, [tasks, priorityFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c.value, []]));
    for (const t of filtered) {
      if (map[t.category]) map[t.category].push(t);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done  = tasks.filter((t) => t.status === 'done').length;
    const open  = total - done;
    return { total, done, open };
  }, [tasks]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>משימות</h1>
          <p className="subtitle">
            סה"כ {stats.total} · פתוחות {stats.open} · הושלמו {stats.done}
          </p>
        </div>
      </header>

      {error && <div className="banner error">שגיאה: {error}</div>}

      <TaskForm onAdd={addTask} />

      <Filters
        priorityFilter={priorityFilter}
        statusFilter={statusFilter}
        onPriorityChange={setPriorityFilter}
        onStatusChange={setStatusFilter}
      />

      {loading ? (
        <p className="loading">טוען...</p>
      ) : (
        <main className="board">
          {CATEGORIES.map((cat) => (
            <CategoryColumn
              key={cat.value}
              category={cat}
              tasks={grouped[cat.value] ?? []}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
        </main>
      )}

      <footer className="app-footer">
        <span>Mesimot · React + Supabase + Telegram</span>
      </footer>
    </div>
  );
}
