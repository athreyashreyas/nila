import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3';

const VAPID_PUBLIC  = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL  = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails('mailto:nila@nila.app', VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { user_id, title, body } = await req.json() as {
      user_id: string;
      title: string;
      body: string;
    };

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
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
