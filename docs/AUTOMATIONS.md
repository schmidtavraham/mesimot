# Automation Reminders — Setup & Usage

> מה זה: צינור שבו אוטומציה חיצונית (לדוגמה Claude Code שמייצר טיוטת פוסט) שולחת POST למשימות, והאפליקציה מקבלת push + מציגה כרטיס עם ההקשר.

---

## 🧩 רכיבי המערכת

| רכיב | מיקום | תפקיד |
|---|---|---|
| `automation_tasks` table | `supabase/migration_add_automations.sql` | מאחסן את המשימות מהאוטומציות |
| `webhook_tokens` table | אותו migration | Bearer tokens (hash) פר משתמש |
| `push_subscriptions` table | אותו migration | מנויי Web Push פר דפדפן |
| `ingest-task` Edge Function | `supabase/functions/ingest-task/` | endpoint ציבורי שמקבל את ה-webhook |
| `send-test-push` Edge Function | `supabase/functions/send-test-push/` | בדיקת התראה מההגדרות באפליקציה |
| Service Worker | `public/sw.js` | מקבל push events ומציג notification |
| Settings UI | `src/components/Settings.jsx` | ניהול טוקנים + הפעלת התראות |
| Automations page | `src/components/Automations.jsx` | רשימת המשימות + פעולות מהירות |

---

## ⚙️ התקנה — צעד-אחר-צעד

### 1) הרצת המיגרציה ב-Supabase

```bash
# Supabase Dashboard → SQL Editor → New query
# העתק את כל התוכן של supabase/migration_add_automations.sql ולחץ Run
```

### 2) הפקת מפתחות VAPID

על המחשב שלך:

```bash
npx web-push generate-vapid-keys
```

תקבל שני ערכים — `Public Key` ו-`Private Key`.

### 3) Frontend env

ב-`.env`:
```
VITE_VAPID_PUBLIC_KEY=<Public Key מהשלב הקודם>
```

ב-GitHub Secrets (אם פורסים ל-GH Pages):
- `VITE_VAPID_PUBLIC_KEY` = אותו ערך

### 4) Edge Function secrets

```bash
# התקן Supabase CLI אם עוד אין: npm i -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF

supabase secrets set VAPID_PUBLIC_KEY=<public>
supabase secrets set VAPID_PRIVATE_KEY=<private>
supabase secrets set VAPID_SUBJECT=mailto:you@example.com
# SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY כבר קיימים אוטומטית ב-Edge runtime
```

### 5) Deploy של ה-Edge Functions

```bash
supabase functions deploy ingest-task     --no-verify-jwt
supabase functions deploy send-test-push
```

הדגל `--no-verify-jwt` חשוב ל-`ingest-task` — האוטומציות לא משתמשות ב-Supabase JWT, אלא בטוקן שלנו.
(אם משתמשים ב-`config.toml` שבמעבר זה, Supabase יידע מעצמו.)

### 6) יצירת טוקן

1. היכנס לאפליקציה → **הגדרות** → **טוקני Webhook**
2. תן שם (לדוגמה `greenvest-marketing`) → לחץ **צור טוקן**
3. **העתק את הטוקן עכשיו** — הוא מוצג רק פעם אחת.

### 7) הפעלת Push בדפדפן

1. **הגדרות** → **התראות Push** → **הפעל התראות**
2. אשר בדפדפן כשתתבקש
3. לחץ **שלח בדיקה** — אם הגיעה התראה ✅ הכל מוכן.

> **מובייל:** קודם הוסף את האפליקציה למסך הבית (Share → Add to Home Screen). רק אז אפשר להפעיל push.

---

## 📡 שימוש מ-Claude Code / אוטומציה חיצונית

### Endpoint
```
POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest-task
```

### Headers
```
Authorization: Bearer msm_xxxxxxxxxxxx...
Content-Type:  application/json
```

### Payload דוגמה

```json
{
  "source": "greenvest-facebook-weekly-draft",
  "title": "טיוטת פוסט פייסבוק לשבוע 17.5",
  "summary": "פוסט חדש מוכן לאישור — נושא: זמן החזר",
  "priority": "normal",
  "category": "marketing",
  "context": {
    "automation_name": "Facebook Weekly Draft",
    "ran_at": "2026-05-17T08:00:00+03:00",
    "what_happened": "Claude כתב טיוטת פוסט חדשה לפייסבוק",
    "what_to_do": "פתח את הקובץ, קרא, העתק לפייסבוק"
  },
  "attachments": [
    {
      "type":  "file",
      "path":  "C:\\Dev\\greenvest-marketing\\content\\social\\drafts\\facebook-2026-05-17.md",
      "label": "טיוטת הפוסט"
    }
  ],
  "actions": [
    { "label": "סמן כפורסם",       "type": "complete" },
    { "label": "דחה לשבוע הבא",   "type": "snooze", "days": 7 }
  ]
}
```

### Curl לבדיקה

```bash
curl -X POST "https://YOUR-PROJECT-REF.supabase.co/functions/v1/ingest-task" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test-cli",
    "title":  "בדיקה ידנית",
    "summary":"מבדיקה — אפשר למחוק",
    "priority":"normal",
    "category":"general"
  }'
```

תגובת הצלחה (`201 Created`):
```json
{ "ok": true, "task_id": "uuid...", "push": { "ok": 1, "failed": 0, "gone": 0 } }
```

### Validation

| שדה | חובה | ברירת מחדל | אילוצים |
|---|:-:|---|---|
| `source` | ✓ | — | string, עד 200 תווים |
| `title` | ✓ | — | string, עד 500 תווים |
| `summary` | — | null | string |
| `priority` | — | `normal` | `low / normal / high / urgent` |
| `category` | — | null | `marketing / sales / installation / general` |
| `context` | — | `{}` | אובייקט JSON חופשי, מומלץ: `automation_name`, `ran_at`, `what_happened`, `what_to_do` |
| `attachments` | — | `[]` | מערך של אובייקטים — `{ type, path|url, label }` |
| `actions` | — | `[]` | מערך — `{ label, type, days? }`. כרגע מוצג כמקור אינפורמטיבי; הכפתורים באפליקציה הם complete/snooze/dismiss |

### תגובות שגיאה

| Status | Body | מתי |
|---|---|---|
| 401 | `{ "error": "Missing Bearer token" }` | אין header `Authorization` |
| 401 | `{ "error": "Invalid token" }` | טוקן לא מוכר |
| 400 | `{ "error": "Missing or invalid \"title\"" }` | payload לא תקין |
| 405 | — | method !== POST |
| 500 | `{ "error": "...", "detail": "..." }` | שגיאה פנימית |

---

## 🔁 שילוב בפרומפט של אוטומציה

הוסף לסוף הפרומפט של כל אוטומציה ב-`greenvest-marketing`:

```markdown
---

## 🔔 שליחת התראה ל-Mesimot

אחרי שסיימת את העבודה, שלח POST ל-Mesimot כדי שאקבל תזכורת:

```bash
curl -X POST "{{MESIMOT_INGEST_URL}}" \
  -H "Authorization: Bearer {{MESIMOT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "source": "greenvest-facebook-weekly-draft",
  "title": "טיוטת פוסט לאישור — {{TODAY}}",
  "summary": "{{SUMMARY_FROM_DRAFT}}",
  "priority": "normal",
  "category": "marketing",
  "context": {
    "automation_name": "Facebook Weekly Draft",
    "ran_at": "{{NOW_ISO}}",
    "what_happened": "Claude כתב טיוטת פוסט חדשה",
    "what_to_do": "פתח את הקובץ, קרא, העתק לפייסבוק"
  },
  "attachments": [
    { "type": "file", "path": "{{DRAFT_PATH}}", "label": "טיוטת הפוסט" }
  ]
}
JSON
```
```

---

## 🧪 איך לבדוק שזה עובד

1. צור משתמש באפליקציה והתחבר
2. הגדרות → צור טוקן → הפעל Push → שלח בדיקה
3. ב-terminal הרץ את הקרל שלמעלה עם הטוקן שלך
4. תוך 1–3 שניות — התראה צריכה להופיע + המשימה ברשימת "אוטומציות" באפליקציה

---

## 🛡️ אבטחה

- הטוקן נשמר ב-DB כ-SHA256 hash בלבד. אם הוא דולף — צור חדש ומחק את הישן.
- הטוקנים שייכים פר-משתמש (RLS). אם תיצור עוד משתמש, הטוקנים שלו לא יתערבבו.
- ה-Edge Function משתמשת ב-`service_role` רק אחרי שאימתה את הטוקן.
- VAPID Private Key נמצא רק ב-Supabase Secrets, אף פעם לא ב-frontend.

---

## 🐛 פתרון בעיות

| תופעה | פתרון |
|---|---|
| `Invalid token` 401 | ודא שהטוקן ב-Bearer הוא הערך המלא (`msm_...`) ולא קיצור |
| Push לא מגיע | בדפדפן Notification permission = `granted`? יש subscription? בדוק ב-DevTools → Application → Service Workers |
| iOS לא מאשר התראות | חובה לפתוח את האפליקציה מ-Home Screen (לא מ-Safari רגיל) |
| `verify_jwt` blocking | הרץ `supabase functions deploy ingest-task --no-verify-jwt` |
| הטבלאות לא קיימות | הרץ את המיגרציה `migration_add_automations.sql` |
