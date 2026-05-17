// Webhook token management — client side.
// Tokens are generated in the browser, only the SHA256 hash is stored in DB.
// The raw token is shown to the user ONCE and never retrievable again.

import { supabase } from './supabase.js';

const TOKEN_PREFIX = 'msm_';
const TOKEN_BYTES  = 32; // 256 bits

async function sha256Hex(text) {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomTokenBody() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  // base64url (no padding)
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function listTokens(userId) {
  const { data, error } = await supabase
    .from('webhook_tokens')
    .select('id, label, token_prefix, last_used_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createToken(userId, label) {
  const cleanLabel = String(label ?? '').trim();
  if (!cleanLabel) throw new Error('שם טוקן הוא חובה');

  const raw    = `${TOKEN_PREFIX}${randomTokenBody()}`;
  const hash   = await sha256Hex(raw);
  const prefix = raw.slice(0, 12);

  const { error } = await supabase
    .from('webhook_tokens')
    .insert({
      user_id: userId,
      token_hash: hash,
      token_prefix: prefix,
      label: cleanLabel.slice(0, 100),
    });

  if (error) throw new Error(error.message);
  return { rawToken: raw, prefix };
}

export async function deleteToken(tokenId) {
  const { error } = await supabase
    .from('webhook_tokens')
    .delete()
    .eq('id', tokenId);
  if (error) throw new Error(error.message);
}
