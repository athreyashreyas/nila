import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3';

const VAPID_PUBLIC  = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL  = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails('mailto:nila@nila.app', VAPID_PUBLIC, VAPID_PRIVATE);

// The local hour (0..23) in a given IANA timezone, right now.
function localHour(timezone: string): number {
  try {
    const s = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date());
    // "24" can appear at midnight in some environments; normalise to 0.
    return Number(s) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

// True if `hour` falls within the quiet window [start, end), handling windows
// that wrap past midnight (e.g. 22 to 7).
function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    // `type` lets a caller mark a send (e.g. the evening round-up) so prefs can
    // gate it; it defaults to a normal reminder.
    const { user_id, title, body, type } = await req.json() as {
      user_id: string;
      title: string;
      body: string;
      type?: 'reminder' | 'roundup';
    };

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Honour the user's notification preferences: skip during quiet hours, and
    // skip the evening round-up unless it is turned on.
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user_id)
      .single();
    const prefs = (profile?.preferences ?? {}) as {
      timezone?: string;
      notifications?: { quietHours?: { enabled?: boolean; start?: number; end?: number }; roundup?: boolean };
    };
    const notif = prefs.notifications ?? {};

    if (type === 'roundup' && !notif.roundup) {
      return new Response(JSON.stringify({ sent: 0, skipped: 'roundup-off' }), { status: 200 });
    }

    const q = notif.quietHours;
    if (q?.enabled && typeof q.start === 'number' && typeof q.end === 'number') {
      const hour = localHour(prefs.timezone ?? 'UTC');
      if (inQuietHours(hour, q.start, q.end)) {
        return new Response(JSON.stringify({ sent: 0, skipped: 'quiet-hours' }), { status: 200 });
      }
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const payload = JSON.stringify({ title, body });
    const results = await Promise.allSettled(
      subs.map((row) => webpush.sendNotification(row.subscription, payload))
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
