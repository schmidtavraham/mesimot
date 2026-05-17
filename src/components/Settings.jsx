import { useEffect, useState } from 'react';
import {
  isPushSupported,
  getCurrentSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestPush,
} from '../lib/push.js';
import {
  listTokens,
  createToken,
  deleteToken,
} from '../lib/tokens.js';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6"  y2="18" />
    <line x1="6"  y1="6" x2="18" y2="18" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return ''; }
};

export default function Settings({ userId, onClose }) {
  const [pushStatus, setPushStatus] = useState({ supported: false });
  const [pushBusy,   setPushBusy]   = useState(false);
  const [pushMsg,    setPushMsg]    = useState(null);

  const [tokens, setTokens] = useState([]);
  const [tokenLabel, setTokenLabel] = useState('');
  const [newToken, setNewToken] = useState(null);
  const [tokenBusy, setTokenBusy] = useState(false);

  const [error, setError] = useState(null);

  const refreshTokens = async () => {
    try { setTokens(await listTokens(userId)); }
    catch (e) { setError(e.message); }
  };
  const refreshPush = async () => {
    setPushStatus(await getCurrentSubscriptionStatus());
  };

  useEffect(() => {
    refreshTokens();
    refreshPush();
  }, [userId]);

  const handleSubscribe = async () => {
    setPushBusy(true);
    setPushMsg(null);
    try {
      await subscribeToPush(userId);
      await refreshPush();
      setPushMsg({ type: 'ok', text: 'נרשמת לקבלת התראות 🎉' });
    } catch (e) {
      setPushMsg({ type: 'err', text: e.message });
    } finally {
      setPushBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setPushBusy(true);
    setPushMsg(null);
    try {
      await unsubscribeFromPush(userId);
      await refreshPush();
      setPushMsg({ type: 'ok', text: 'בוטל. לא תקבל יותר התראות מהדפדפן הזה.' });
    } catch (e) {
      setPushMsg({ type: 'err', text: e.message });
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const res = await sendTestPush();
      if (res?.ok) setPushMsg({ type: 'ok', text: `נשלחה התראה ל-${res.sent} מכשיר${res.sent === 1 ? '' : 'ים'}.` });
      else setPushMsg({ type: 'err', text: 'לא נשלחה התראה. ודא שיש מנוי פעיל.' });
    } catch (e) {
      setPushMsg({ type: 'err', text: e.message });
    } finally {
      setPushBusy(false);
    }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    const label = tokenLabel.trim();
    if (!label) return;
    setTokenBusy(true);
    setError(null);
    setNewToken(null);
    try {
      const { rawToken } = await createToken(userId, label);
      setNewToken(rawToken);
      setTokenLabel('');
      await refreshTokens();
    } catch (e) {
      setError(e.message);
    } finally {
      setTokenBusy(false);
    }
  };

  const handleDeleteToken = async (id) => {
    if (!window.confirm('למחוק את הטוקן? האוטומציות שמשתמשות בו יפסיקו לעבוד.')) return;
    try {
      await deleteToken(id);
      await refreshTokens();
    } catch (e) {
      setError(e.message);
    }
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <header className="modal-header">
          <div>
            <h2>הגדרות</h2>
            <p className="modal-sub">התראות Push וטוקני Webhook</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="סגירה">
            <CloseIcon />
          </button>
        </header>

        <div className="modal-body">
          {error && <div className="banner error">{error}</div>}

          {/* ===== Push ===== */}
          <section className="settings-section">
            <h3>התראות Push</h3>

            {!pushStatus.supported && (
              <p className="settings-note">הדפדפן הזה לא תומך ב-Web Push.</p>
            )}

            {pushStatus.supported && (
              <>
                <div className="settings-row">
                  <div className="settings-info">
                    <strong>סטטוס:</strong>{' '}
                    {pushStatus.subscribed
                      ? <span className="status-ok">פעיל בדפדפן הזה</span>
                      : <span className="status-off">לא פעיל</span>}
                    <span className="settings-muted">  ·  הרשאה: {pushStatus.permission}</span>
                  </div>
                  <div className="settings-actions">
                    {pushStatus.subscribed ? (
                      <>
                        <button type="button" className="link-btn" disabled={pushBusy} onClick={handleTestPush}>
                          שלח בדיקה
                        </button>
                        <button type="button" className="link-btn danger" disabled={pushBusy} onClick={handleUnsubscribe}>
                          בטל מנוי
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn-submit" disabled={pushBusy} onClick={handleSubscribe}>
                        הפעל התראות
                      </button>
                    )}
                  </div>
                </div>

                {pushMsg && (
                  <p className={`settings-msg ${pushMsg.type === 'err' ? 'err' : 'ok'}`}>{pushMsg.text}</p>
                )}

                <p className="settings-help">
                  במובייל — הוסף את האפליקציה למסך הבית (Share → Add to Home Screen) לפני שתאשר התראות.
                </p>
              </>
            )}
          </section>

          {/* ===== Webhook tokens ===== */}
          <section className="settings-section">
            <h3>טוקני Webhook</h3>
            <p className="settings-help">
              צור טוקן לכל אוטומציה. הטוקן יוצג רק <strong>פעם אחת</strong>. שמור אותו במקום בטוח —
              לא נשמר אצלנו בצורה הפיכה.
            </p>

            <form onSubmit={handleCreateToken} className="settings-token-form">
              <input
                type="text"
                placeholder="שם הטוקן (לדוגמה: greenvest-marketing)"
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                disabled={tokenBusy}
              />
              <button type="submit" className="btn-submit" disabled={tokenBusy || !tokenLabel.trim()}>
                צור טוקן
              </button>
            </form>

            {newToken && (
              <div className="settings-new-token">
                <div>
                  <strong>הטוקן החדש (נשמר רק עכשיו):</strong>
                  <code dir="ltr">{newToken}</code>
                </div>
                <button type="button" className="link-btn" onClick={() => copy(newToken)}>
                  <CopyIcon /> העתק
                </button>
                <button type="button" className="link-btn" onClick={() => setNewToken(null)}>סגור</button>
              </div>
            )}

            {tokens.length === 0 ? (
              <p className="settings-muted">אין עדיין טוקנים.</p>
            ) : (
              <table className="settings-tokens-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>קידומת</th>
                    <th>נוצר</th>
                    <th>שימוש אחרון</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr key={t.id}>
                      <td>{t.label}</td>
                      <td><code dir="ltr">{t.token_prefix}…</code></td>
                      <td>{formatDate(t.created_at)}</td>
                      <td>{formatDate(t.last_used_at)}</td>
                      <td>
                        <button type="button" className="link-btn danger"
                                onClick={() => handleDeleteToken(t.id)}>
                          מחק
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ===== Endpoint reference ===== */}
          <section className="settings-section">
            <h3>איך לקרוא ל-Webhook</h3>
            <p className="settings-help">
              ה-endpoint הציבורי לקבלת משימות מאוטומציות:
            </p>
            <code className="settings-endpoint" dir="ltr">
              POST {import.meta.env.VITE_SUPABASE_URL ?? '<SUPABASE_URL>'}/functions/v1/ingest-task
            </code>
            <p className="settings-help">
              עם header: <code dir="ltr">Authorization: Bearer YOUR_TOKEN</code> ו-body JSON
              לפי הסכמה במסמך <code>task-app-requirements.md</code>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
