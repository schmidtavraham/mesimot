import { useEffect, useMemo, useState } from 'react';
import { supabase, CATEGORIES } from './lib/supabase.js';
import TaskForm from './components/TaskForm.jsx';
import Filters from './components/Filters.jsx';
import CategoryColumn from './components/CategoryColumn.jsx';
import Archive from './components/Archive.jsx';
import Automations from './components/Automations.jsx';
import Settings from './components/Settings.jsx';
import Login from './components/Login.jsx';
import { registerServiceWorker } from './lib/push.js';
import './App.css';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const compareForDisplay = (a, b) => {
  const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (pr !== 0) return pr;
  return (b.sort_order ?? 0) - (a.sort_order ?? 0);
};

export default function App() {
  const [session, setSession]     = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');

  const [showUserId, setShowUserId]       = useState(false);
  const [showArchive, setShowArchive]     = useState(false);
  const [showFilters, setShowFilters]     = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [openAutomationCount, setOpenAutomationCount] = useState(0);

  const [draggingTask, setDraggingTask] = useState(null);

  // --- DIAGNOSTIC (temporary) ---
  const [diag, setDiag] = useState('init');

  useEffect(() => {
    setDiag('calling getSession…');
    const t0 = Date.now();
    supabase.auth.getSession()
      .then(({ data, error }) => {
        setDiag(`getSession OK in ${Date.now() - t0}ms · session=${!!data?.session}${error ? ' · err=' + error.message : ''}`);
        setSession(data.session);
        setAuthReady(true);
      })
      .catch((e) => {
        setDiag('getSession THREW: ' + (e?.message || String(e)));
        setAuthReady(true);
      });

    // watchdog: if getSession never resolves, say so on screen
    const watchdog = setTimeout(() => {
      setDiag((d) => d.startsWith('getSession OK') || d.startsWith('getSession THREW')
        ? d
        : 'getSession STILL PENDING after 6s — THIS IS THE HANG');
    }, 6000);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    registerServiceWorker().catch(() => {});

    const onSwMessage = (e) => {
      if (e.data?.type === 'AUTOMATION_TASK_OPEN') setShowAutomations(true);
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    return () => {
      clearTimeout(watchdog);
      sub.subscription.unsubscribe();
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, []);

  // Track open-automation count for the header badge (separate from the modal).
  useEffect(() => {
    if (!session) { setOpenAutomationCount(0); return; }

    const refreshCount = async () => {
      const { count } = await supabase
        .from('automation_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'open');
      setOpenAutomationCount(count ?? 0);
    };
    refreshCount();

    const channel = supabase
      .channel('automation-tasks-count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'automation_tasks', filter: `user_id=eq.${session.user.id}` },
        refreshCount)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const fetchTasks = async () => {
    setDiag((d) => d + ' | fetchTasks…');
    const t0 = Date.now();
    try {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        setDiag((d) => d + ` | fetchTasks ERR: ${error.message}`);
        setError(error.message);
        setLoading(false);
        return;
      }
      setDiag((d) => d + ` | fetchTasks OK ${Date.now() - t0}ms (${(data ?? []).length})`);
      setTasks(data ?? []);
      setError(null);
      setLoading(false);
    } catch (e) {
      setDiag((d) => d + ' | fetchTasks THREW: ' + (e?.message || String(e)));
      setError(String(e?.message || e));
      setLoading(false);
    }
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

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const addTask = async ({ title, category, priority }) => {
    const { error } = await supabase.from('tasks').insert({
      title, category, priority,
      status: 'open', source: 'web',
      user_id: session.user.id,
      sort_order: Date.now(),
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

  const restoreTask = (id) => updateTask(id, { status: 'open' });

  const signOut = async () => {
    await supabase.auth.signOut();
    setTasks([]);
  };

  const copyUserId = async () => {
    try { await navigator.clipboard.writeText(session.user.id); } catch {}
  };

  // הפרדה: פעיל / ארכיון
  const activeTasks   = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter((t) => t.status === 'done'), [tasks]);

  const filtered = useMemo(() => {
    return activeTasks.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter   !== 'all' && t.status   !== statusFilter)   return false;
      return true;
    });
  }, [activeTasks, priorityFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c.value, []]));
    for (const t of filtered) {
      if (map[t.category]) map[t.category].push(t);
    }
    for (const k of Object.keys(map)) map[k].sort(compareForDisplay);
    return map;
  }, [filtered]);

  // Drag & Drop
  const handleDragStart = (task) => setDraggingTask(task);
  const handleDragEnd   = ()      => setDraggingTask(null);

  const handleDropOn = (targetTask, position /* 'before' | 'after' */) => {
    if (!draggingTask) return;
    if (draggingTask.id === targetTask.id) return;
    if (draggingTask.category !== targetTask.category) return;
    if (draggingTask.priority !== targetTask.priority) return;

    const list = activeTasks
      .filter((t) =>
        t.category === targetTask.category &&
        t.priority === targetTask.priority &&
        t.id !== draggingTask.id,
      )
      .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0));

    const targetIdx = list.findIndex((t) => t.id === targetTask.id);
    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;

    const above = list[insertIdx - 1];
    const below = list[insertIdx];

    let newOrder;
    if (above && below)      newOrder = (above.sort_order + below.sort_order) / 2;
    else if (above)          newOrder = above.sort_order - 1;
    else if (below)          newOrder = below.sort_order + 1;
    else                     newOrder = Date.now();

    updateTask(draggingTask.id, { sort_order: newOrder });
    setDraggingTask(null);
  };

  const stats = useMemo(() => ({
    open: activeTasks.length,
    done: archivedTasks.length,
  }), [activeTasks, archivedTasks]);

  const filtersActive = priorityFilter !== 'all' || statusFilter !== 'all';

  if (!authReady) return (
    <div className="loading" style={{ padding: 20, direction: 'ltr', fontSize: 12, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
      טוען...{'\n\n'}DIAG ▸ {diag}
    </div>
  );
  if (!session)   return <Login />;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>משימות</h1>
          <p className="subtitle">פעילות {stats.open} · בארכיון {stats.done}</p>
        </div>
        <div className="user-menu">
          <span className="user-email">{session.user.email}</span>
          <button className="link-btn" onClick={() => setShowSettings(true)}>
            הגדרות
          </button>
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

      <div className="action-row">
        <TaskForm onAdd={addTask} />

        <button
          type="button"
          className={`icon-btn ${filtersActive ? 'has-active' : ''}`}
          onClick={() => setShowFilters(true)}
          title="סינון"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>סינון</span>
          {filtersActive && <span className="dot-active" />}
        </button>

        <button
          type="button"
          className={`icon-btn ${openAutomationCount > 0 ? 'has-active' : ''}`}
          onClick={() => setShowAutomations(true)}
          title="אוטומציות"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
          </svg>
          <span>אוטומציות</span>
          {openAutomationCount > 0 && (
            <span className="archive-badge">{openAutomationCount}</span>
          )}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowArchive(true)}
          title="ארכיון"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="5" rx="1"/>
            <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2V8"/>
            <line x1="10" y1="13" x2="14" y2="13"/>
          </svg>
          <span>ארכיון</span>
          {archivedTasks.length > 0 && (
            <span className="archive-badge">{archivedTasks.length}</span>
          )}
        </button>
      </div>

      {loading ? (
        <p className="loading" style={{ direction: 'ltr', fontSize: 12, whiteSpace: 'pre-wrap' }}>טוען...{'\n'}DIAG ▸ {diag}</p>
      ) : (
        <main className="board">
          {CATEGORIES.map((cat) => (
            <CategoryColumn
              key={cat.value}
              category={cat}
              tasks={grouped[cat.value] ?? []}
              onUpdate={updateTask}
              onDelete={deleteTask}
              draggingTask={draggingTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDropOn={handleDropOn}
            />
          ))}
        </main>
      )}

      <footer className="app-footer">
        <span>Mesimot · React + Supabase + Telegram</span>
      </footer>

      <Filters
        open={showFilters}
        priorityFilter={priorityFilter}
        statusFilter={statusFilter}
        onPriorityChange={setPriorityFilter}
        onStatusChange={setStatusFilter}
        onClose={() => setShowFilters(false)}
      />

      {showArchive && (
        <Archive
          tasks={archivedTasks}
          onClose={() => setShowArchive(false)}
          onRestore={restoreTask}
          onDelete={deleteTask}
        />
      )}

      {showAutomations && (
        <Automations
          userId={session.user.id}
          onClose={() => setShowAutomations(false)}
          onCountChange={setOpenAutomationCount}
        />
      )}

      {showSettings && (
        <Settings
          userId={session.user.id}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
