// ============================================================
// POST /functions/v1/send-test-push
// Authenticated endpoint (Supabase JWT) — sends a test push
// to ALL of the caller's push subscriptions. Used by the
// Settings UI to verify push setup.
// ============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { configureWebPush, sendToAll } from '../_shared/push.ts';

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey     = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  // Resolve caller's user_id from their JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const userId = userData.user.id;

  // Service-role client to fetch + clean subscriptions
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: subs, error: subErr } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (subErr) return json({ error: subErr.message }, 500);
  if (!subs || subs.length === 0) {
    return json({ ok: false, reason: 'no_subscriptions' });
  }

  try {
    configureWebPush();
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  const result = await sendToAll(subs, {
    title: 'Mesimot — בדיקת התראה',
    body:  'אם אתה רואה את זה, ה-Push מוגדר נכון 🎉',
    taskId: 'test',
  });

  if (result.gone.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', result.gone);
  }

  return json({
    ok: result.ok > 0,
    sent: result.ok,
    failed: result.failed.length,
    gone:   result.gone.length,
  });
});
