// ============================================================
// POST /functions/v1/ingest-task
// Public webhook for external automations to push reminders.
// Auth: Bearer token (per-user, hashed in webhook_tokens).
// On success: inserts row in automation_tasks + sends Web Push.
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/hash.ts';
import { configureWebPush, sendToAll } from '../_shared/push.ts';

const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const VALID_CATEGORIES = new Set(['marketing', 'sales', 'installation', 'general']);

type Payload = {
  source: string;
  title: string;
  summary?: string;
  priority?: string;
  category?: string;
  context?: Record<string, unknown>;
  attachments?: unknown[];
  actions?: unknown[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ---- 1. Bearer token ----
  const authHeader = req.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return json({ error: 'Missing Bearer token' }, 401);
  }
  const rawToken = match[1].trim();
  if (rawToken.length < 16) {
    return json({ error: 'Invalid token' }, 401);
  }
  const tokenHash = await sha256Hex(rawToken);

  // ---- 2. Supabase service-role client ----
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ---- 3. Look up token → user_id ----
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('webhook_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenErr) {
    return json({ error: 'DB error', detail: tokenErr.message }, 500);
  }
  if (!tokenRow) {
    return json({ error: 'Invalid token' }, 401);
  }

  // ---- 4. Parse + validate payload ----
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!payload?.title || typeof payload.title !== 'string') {
    return json({ error: 'Missing or invalid "title"' }, 400);
  }
  if (!payload?.source || typeof payload.source !== 'string') {
    return json({ error: 'Missing or invalid "source"' }, 400);
  }
  if (payload.title.length > 500) {
    return json({ error: '"title" too long (max 500)' }, 400);
  }

  const priority = payload.priority && VALID_PRIORITIES.has(payload.priority)
    ? payload.priority
    : 'normal';

  const category = payload.category && VALID_CATEGORIES.has(payload.category)
    ? payload.category
    : null;

  // ---- 5. Insert task ----
  const { data: task, error: insertErr } = await supabase
    .from('automation_tasks')
    .insert({
      user_id:     tokenRow.user_id,
      source:      payload.source.slice(0, 200),
      title:       payload.title,
      summary:     typeof payload.summary === 'string' ? payload.summary : null,
      priority,
      category,
      context:     payload.context ?? {},
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      actions:     Array.isArray(payload.actions) ? payload.actions : [],
    })
    .select('id')
    .single();

  if (insertErr) {
    return json({ error: 'Insert failed', detail: insertErr.message }, 500);
  }

  // ---- 6. Update token last_used_at (fire-and-forget) ----
  supabase.from('webhook_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
    .then(() => {});

  // ---- 7. Send push to user's subscriptions ----
  let pushSummary: Record<string, unknown> = { skipped: true };
  try {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', tokenRow.user_id);

    if (subs && subs.length > 0) {
      configureWebPush();
      const result = await sendToAll(subs, {
        title: payload.title,
        body:  payload.summary ?? payload.source,
        taskId: task.id,
      });
      pushSummary = { ok: result.ok, failed: result.failed.length, gone: result.gone.length };

      // clean up dead subscriptions
      if (result.gone.length > 0) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('id', result.gone);
      }
    } else {
      pushSummary = { skipped: true, reason: 'no_subscriptions' };
    }
  } catch (err) {
    pushSummary = { error: (err as Error).message };
  }

  return json({ ok: true, task_id: task.id, push: pushSummary }, 201);
});
