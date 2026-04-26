import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';

const {
  TELEGRAM_BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ALLOWED_CHAT_IDS = '',
} = process.env;

if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('חסרים משתני סביבה. ראה bot/.env.example');
  process.exit(1);
}

const allowed = new Set(
  ALLOWED_CHAT_IDS.split(',').map((s) => s.trim()).filter(Boolean),
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const CATEGORY_ALIASES = {
  'עבודה': 'work',     'work': 'work',
  'בית':   'home',     'home': 'home',
  'אישי':  'personal', 'personal': 'personal',
};

const PRIORITY_ALIASES = {
  'גבוהה':  'high',   'high':   'high',
  'בינונית': 'medium', 'medium': 'medium',
  'נמוכה':  'low',    'low':    'low',
};

const isAllowed = (chatId) =>
  allowed.size === 0 ? false : allowed.has(String(chatId));

const help = `שלום! זה הבוט של Mesimot 📝

דוגמאות פקודות:
• /add עבודה גבוהה לסיים את הדוח השבועי
• /add בית בינונית לקנות חלב
• /add אישי לקרוא 30 דקות    ← אם לא תציין עדיפות, ברירת מחדל: בינונית
• /list                          ← הצגת המשימות הפתוחות
• /id                            ← הצגת ה-chat ID שלך (להוספה ל-ALLOWED_CHAT_IDS)

קטגוריות: עבודה, בית, אישי
עדיפויות: גבוהה, בינונית, נמוכה`;

bot.onText(/^\/start$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `${help}\n\nה-chat ID שלך: <code>${msg.chat.id}</code>`,
    { parse_mode: 'HTML' },
  );
});

bot.onText(/^\/id$/, (msg) => {
  bot.sendMessage(msg.chat.id, `chat ID: ${msg.chat.id}`);
});

bot.onText(/^\/help$/, (msg) => {
  bot.sendMessage(msg.chat.id, help);
});

bot.onText(/^\/add(?:\s+(.+))?$/s, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) {
    bot.sendMessage(chatId, `אין לך הרשאה. הוסף את ${chatId} ל-ALLOWED_CHAT_IDS`);
    return;
  }

  const args = (match[1] ?? '').trim();
  if (!args) {
    bot.sendMessage(chatId, 'שימוש: /add [קטגוריה] [עדיפות] [טקסט המשימה]');
    return;
  }

  const tokens = args.split(/\s+/);
  let category = null;
  let priority = 'medium';
  let i = 0;

  if (tokens[i] && CATEGORY_ALIASES[tokens[i]]) {
    category = CATEGORY_ALIASES[tokens[i]];
    i++;
  }
  if (tokens[i] && PRIORITY_ALIASES[tokens[i]]) {
    priority = PRIORITY_ALIASES[tokens[i]];
    i++;
  }

  if (!category) {
    bot.sendMessage(chatId, 'חסרה קטגוריה. אפשרויות: עבודה / בית / אישי');
    return;
  }

  const title = tokens.slice(i).join(' ').trim();
  if (!title) {
    bot.sendMessage(chatId, 'חסר תוכן למשימה.');
    return;
  }

  const { error } = await supabase.from('tasks').insert({
    title, category, priority, status: 'open', source: 'telegram',
  });

  if (error) {
    console.error(error);
    bot.sendMessage(chatId, `שגיאה: ${error.message}`);
    return;
  }
  bot.sendMessage(chatId, `נוספה משימה ✅\n• ${title}`);
});

bot.onText(/^\/list$/, async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) {
    bot.sendMessage(chatId, 'אין לך הרשאה.');
    return;
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('title, category, priority, status, created_at')
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    bot.sendMessage(chatId, `שגיאה: ${error.message}`);
    return;
  }
  if (!data?.length) {
    bot.sendMessage(chatId, 'אין משימות פתוחות 🎉');
    return;
  }

  const catLabel = { work: 'עבודה', home: 'בית', personal: 'אישי' };
  const priLabel = { high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' };
  const statLabel = { open: 'פתוח', in_progress: 'בביצוע' };

  const lines = data.map(
    (t, idx) =>
      `${idx + 1}. [${catLabel[t.category]}] ${t.title}\n   עדיפות: ${priLabel[t.priority]} · ${statLabel[t.status]}`,
  );

  bot.sendMessage(chatId, lines.join('\n\n'));
});

bot.on('polling_error', (err) => {
  console.error('polling_error:', err.message);
});

console.log('Mesimot bot is running...');
