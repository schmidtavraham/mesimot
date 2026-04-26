# משימות (Mesimot)

אפליקציית TODO בעברית, RTL, עם React + Vite, Supabase ובוט טלגרם.
מתארחת חינם ב-GitHub Pages.

## ✨ פיצ'רים

- הוספה / עדכון / מחיקה של משימות מתוך הדפדפן
- הוספה דרך בוט טלגרם (פקודה `/add`)
- שלוש קטגוריות: **עבודה / בית / אישי**
- עדיפות (גבוהה/בינונית/נמוכה) וסטטוס (פתוח/בביצוע/הושלם)
- סינון לפי עדיפות וסטטוס
- סנכרון בזמן אמת בין דפדפן לבוט (Supabase Realtime)

---

## 📁 מבנה הפרויקט

```
mesimot/
├── supabase/schema.sql        ← סכמת מסד הנתונים
├── src/                        ← אפליקציית React
│   ├── components/
│   ├── lib/supabase.js
│   ├── App.jsx
│   └── main.jsx
├── bot/                        ← בוט טלגרם (Node.js)
│   ├── index.js
│   └── package.json
├── .github/workflows/deploy.yml ← פריסה אוטומטית ל-GitHub Pages
└── package.json
```

---

## 🚀 הוראות הפעלה — צעד אחר צעד

### שלב 1 — Supabase

1. היכנס ל-[https://supabase.com](https://supabase.com) וצור פרויקט חדש (חינם).
2. בתפריט הצדדי לחץ **SQL Editor → New query**.
3. פתח את הקובץ [`supabase/schema.sql`](supabase/schema.sql), הדבק את כל התוכן ולחץ **Run**.
4. עבור ל-**Project Settings → API** וקח שני ערכים:
   - **Project URL** → ישמש כ-`VITE_SUPABASE_URL` וגם כ-`SUPABASE_URL`.
   - **anon public** → ישמש כ-`VITE_SUPABASE_ANON_KEY`.
   - **service_role** (סוד!) → ישמש את הבוט בלבד כ-`SUPABASE_SERVICE_ROLE_KEY`.

> ⚠️ ה-`service_role` עוקף RLS. **לעולם** אל תשים אותו ב-Frontend או תעלה אותו ל-Git.

### שלב 2 — הרצת ה-React app מקומית

```bash
npm install
cp .env.example .env
# ערוך את .env והכנס את VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY
npm run dev
```

האפליקציה תרוץ ב-<http://localhost:5173>.

### שלב 3 — בוט הטלגרם

1. פתח טלגרם, לך ל-[@BotFather](https://t.me/BotFather), שלח `/newbot` ועקוב אחרי ההוראות. תקבל **Bot Token**.
2. הגדר את הבוט:
   ```bash
   cd bot
   npm install
   cp .env.example .env
   ```
3. ערוך את `bot/.env`:
   - `TELEGRAM_BOT_TOKEN` = הטוקן שקיבלת מ-BotFather
   - `SUPABASE_URL` = אותו URL מהשלב הראשון
   - `SUPABASE_SERVICE_ROLE_KEY` = ה-service role key
   - `ALLOWED_CHAT_IDS` = השאר ריק לבינתיים
4. הרץ:
   ```bash
   npm start
   ```
5. בטלגרם, שלח `/start` לבוט שלך. תקבל בחזרה את ה-**chat ID** שלך.
6. עצור את הבוט (Ctrl+C), הוסף את ה-chat ID ל-`ALLOWED_CHAT_IDS` (אם יש כמה, הפרד בפסיקים), והרץ שוב `npm start`.

#### פקודות הבוט

| פקודה | דוגמה | מה היא עושה |
|-------|--------|--------------|
| `/add קטגוריה עדיפות טקסט` | `/add עבודה גבוהה לסיים דוח שבועי` | מוסיף משימה |
| `/add קטגוריה טקסט` | `/add בית לקנות חלב` | מוסיף משימה (עדיפות בינונית כברירת מחדל) |
| `/list` | — | מציג עד 20 משימות פתוחות |
| `/id` | — | מציג את ה-chat ID שלך |
| `/help` | — | עזרה |

הבוט יכול לרוץ:
- מקומית במחשב שלך (כל עוד הוא דולק)
- בענן חינם — Render.com / Railway / Fly.io / Replit. הסקריפט הוא Node.js רגיל; פשוט הגדר את משתני הסביבה שם.

### שלב 4 — חיבור הכל

האפליקציה והבוט שניהם כותבים לאותה טבלת `tasks` ב-Supabase.
ה-React app מאזין ל-`postgres_changes` של Supabase Realtime, אז כל משימה שהבוט מוסיף — מופיעה בדפדפן מיד, ללא רענון.

### שלב 5 — פריסה ל-GitHub Pages

1. צור repository ב-GitHub בשם `mesimot`.
2. העלה את הקוד:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/mesimot.git
   git push -u origin main
   ```
3. ב-GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. ב-**Settings → Secrets and variables → Actions** הוסף שני secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. ה-workflow ב-`.github/workflows/deploy.yml` ירוץ אוטומטית בכל push ל-main, יבנה ויפרוס.
6. האתר יהיה זמין ב-`https://YOUR-USER.github.io/mesimot/`.

> אם בחרת שם repo אחר או דומיין מותאם, עדכן את `base` בקובץ [`vite.config.js`](vite.config.js).

---

## 🛡️ הערות אבטחה

- האפליקציה כרגע ללא מנגנון Auth — כל מי שיש לו את הקישור והכתובות יכול לקרוא ולכתוב משימות.
- אם אתה רוצה אבטחה אמיתית, הוסף Supabase Auth ועדכן את ה-RLS policies בסכמה כדי לדרוש `auth.uid()` תואם.
- המפתח ב-Frontend הוא ה-`anon` בלבד. **אל** תכניס אף פעם את ה-`service_role` ל-Frontend או ל-repo ציבורי.
- הבוט בודק `ALLOWED_CHAT_IDS` כדי שלא כל מי שמוצא את הבוט יוכל להוסיף משימות.

---

## 🛠️ פיתוח

- `npm run dev` — שרת פיתוח של Vite
- `npm run build` — בניית production לתיקיית `dist`
- `npm run preview` — תצוגה מקדימה של ה-build
- בוט: `cd bot && npm start`

---

## 📜 רישיון

MIT — חופשי לשימוש אישי.
