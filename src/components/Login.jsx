import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function Login() {
  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);
  const [message, setMessage]   = useState(null);
  const [error, setError]       = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.session) {
          setMessage('נשלח אימייל לאישור — בדוק את תיבת הדואר ולחץ על הקישור.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>משימות</h1>
        <p className="login-subtitle">
          {mode === 'signup' ? 'הרשמה לחשבון חדש' : 'התחברות'}
        </p>

        <form onSubmit={submit} className="login-form">
          <label>
            אימייל
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              dir="ltr"
            />
          </label>

          <label>
            סיסמה
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              dir="ltr"
            />
          </label>

          {error   && <div className="login-error">{error}</div>}
          {message && <div className="login-info">{message}</div>}

          <button type="submit" disabled={busy} className="login-submit">
            {busy ? '...' : mode === 'signup' ? 'יצירת חשבון' : 'כניסה'}
          </button>
        </form>

        <button
          type="button"
          className="login-switch"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup');
            setError(null);
            setMessage(null);
          }}
        >
          {mode === 'signup' ? 'יש לך כבר חשבון? התחבר' : 'אין לך חשבון? הירשם'}
        </button>
      </div>
    </div>
  );
}
