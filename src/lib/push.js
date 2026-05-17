// Browser-side helpers for Web Push subscription management.
// Uses VAPID public key from VITE_VAPID_PUBLIC_KEY.

import { supabase } from './supabase.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager'   in window
    && 'Notification'  in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let binary  = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  return navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL });
}

export async function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

// Returns the current subscription DB row id if already subscribed in DB.
async function findStoredSubscriptionId(endpoint, userId) {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .maybeSingle();
  return data?.id ?? null;
}

export async function subscribeToPush(userId) {
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('חסר VITE_VAPID_PUBLIC_KEY ב-.env');
  }

  const reg = await registerServiceWorker();
  if (!reg) throw new Error('Service Worker לא נתמך בדפדפן הזה');

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('המשתמש דחה את ההרשאה');
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh   = json.keys.p256dh;
  const auth     = json.keys.auth;

  // Already in DB? upsert by endpoint
  const existingId = await findStoredSubscriptionId(endpoint, userId);
  if (existingId) return { ok: true, alreadyStored: true };

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ user_id: userId, endpoint, p256dh, auth, user_agent: navigator.userAgent });

  if (error) throw new Error(error.message);
  return { ok: true, alreadyStored: false };
}

export async function unsubscribeFromPush(userId) {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase.from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
  }
  return { ok: true };
}

export async function getCurrentSubscriptionStatus() {
  if (!isPushSupported()) return { supported: false };

  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: !!sub,
  };
}

export async function sendTestPush() {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('לא מחובר');

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-push`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Push test failed: ${text}`);
  }
  return res.json();
}
