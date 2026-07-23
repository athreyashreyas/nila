/**
 * "What's new" gating, the same pattern as Harmony and Hisaab.
 *
 * The guide's What's-new pane is shown once when you first meet a newer app
 * version. The seen-marker is tracked two ways, and a release is shown only when
 * it is newer than BOTH:
 *
 *   - a synced value on the profile's `preferences` blob, so reading it on your
 *     iPhone suppresses it on your iPad ("once per account");
 *   - this per-device localStorage value, which a profile fetch can never
 *     clobber. The synced value can briefly read as its pre-write state when a
 *     read lands before our update has propagated, which would otherwise
 *     re-trigger the screen ("never repeated on a device").
 *
 * `preferences` already carries the theme, timezone, and notification settings
 * in plaintext; a version string is the same kind of non-health preference, so
 * it rides along there. No health data is involved, and nothing here touches the
 * encrypted path.
 *
 * A brand-new user has just been walked through the guide, so onboarding marks
 * the current version as seen: What's new never greets someone the moment they
 * finish setting up.
 */
import { getSupabaseClient } from '@/lib/supabase/client';

const KEY = 'nila-last-seen-version';

export function getSeenVersionLocal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSeenVersionLocal(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    // ignore (private mode / storage disabled)
  }
}

/** The account-wide marker, from the profile's preferences blob. */
export async function getSeenVersionSynced(): Promise<string | null> {
  try {
    const db = getSupabaseClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    const { data } = await db.from('profiles').select('preferences').eq('id', user.id).single();
    const v = (data?.preferences as Record<string, unknown> | null)?.lastSeenVersion;
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

/** Record the account-wide marker, merged into whatever preferences already hold. */
export async function setSeenVersionSynced(version: string): Promise<void> {
  try {
    const db = getSupabaseClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    const { data } = await db.from('profiles').select('preferences').eq('id', user.id).single();
    const existing = (data?.preferences as object | null) ?? {};
    await db.from('profiles').update({ preferences: { ...existing, lastSeenVersion: version } }).eq('id', user.id);
  } catch {
    // A preferences write must never break boot; the local marker still holds.
  }
}

/**
 * The whole decision, in one place: has this account already met `version`, on
 * this device or any other? Marks it seen on both sides either way, so a genuine
 * first meeting shows exactly once, and a device that lagged quietly catches up.
 * Returns true when What's new should open.
 */
export async function claimUnseenVersion(version: string): Promise<boolean> {
  const local = getSeenVersionLocal();
  const synced = await getSeenVersionSynced();
  const unseen = isNewerVersion(version, local) && isNewerVersion(version, synced);

  if (isNewerVersion(version, local)) setSeenVersionLocal(version);
  if (isNewerVersion(version, synced)) void setSeenVersionSynced(version);

  return unseen;
}

/** Mark a version seen without showing anything. Used when onboarding ends. */
export function markVersionSeen(version: string): void {
  setSeenVersionLocal(version);
  void setSeenVersionSynced(version);
}

/**
 * True if `a` ("x.y.z") is strictly newer than `b`. A null or empty `b` counts
 * as older than anything, so a first-ever run is treated as new.
 */
export function isNewerVersion(a: string, b: string | null): boolean {
  if (!b) return true;
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
