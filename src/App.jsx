import { useEffect, useMemo, useState } from 'react';
import { supabase, CATEGORIES } from './lib/supabase.js';
import TaskForm from './components/TaskForm.jsx';
import Filters from './components/Filters.jsx';
import CategoryColumn from './components/CategoryColumn.jsx';
import Login from './components/Login.jsx';
import './App.css';

export default function App() {
  const [session, setSession]   = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [showUserId, setShowUserId] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

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
    if (!session) return;

    setLoading(true);
    fetchTasks();

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${session.user.id}` },
        () => fetchTasks(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const addTask = async ({ title, category, priority }) => {
    const { error } = await supabase.from('tasks').insert({
      title, category, priority,
      status: 'open', source: 'web',
      user_id: session.user.id,
    });
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setTasks([]);
  };

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(session.user.id);
    } catch {
      /* ignore */
    }
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

  if (!authReady) return <p className="loading">טוען...</p>;
  if (!session)   return <Login />;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>משימות</h1>
          <p className="subtitle">
            סה"כ {stats.total} · פתוחות {stats.open} · הושלמו {stats.done}
          </p>
        </div>
        <div className="user-menu">
          <span className="user-email">{session.user.email}</span>
          <button className="link-btn" onClick={() => setShowUserId((v) => !v)}>
            {showUserId ? 'הסתר ID' : 'הצג ID לבוט'}
          </button>
          <button className="link-btn danger" onClick={signOut}>יציאה</button>
        </div>
      </header>

      {showUserId && (
        <div className="banner info">
          <strong>ה-User ID שלך (להגדרת הבוט):</strong>
          <code className="user-id" dir="ltr">{session.user.id}</code>
          <button className="link-btn" onClick={copyUserId}>העתק</button>
        </div>
      )}

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
