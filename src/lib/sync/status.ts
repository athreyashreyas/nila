'use client';

// A tiny external store backing the SyncDot. It tracks three things:
//   online   the browser's network state
//   pending  in-flight Supabase writes right now
//   queued   writes waiting in the durable outbox (made offline or not yet sent)
// Kept outside React (a plain observable) so the outbox and the data hooks, which
// run outside render, can update it, while components read it via useSyncState.
import { useSyncExternalStore } from 'react';

export interface SyncState {
  online: boolean;
  pending: number;
  queued: number;
}

let state: SyncState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  queued: 0,
};

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function set(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  emit();
}

export const syncStatus = {
  setOnline: (online: boolean) => set({ online }),
  beginPending: () => set({ pending: state.pending + 1 }),
  endPending: () => set({ pending: Math.max(0, state.pending - 1) }),
  setQueued: (queued: number) => set({ queued }),
};

function getSnapshot(): SyncState {
  return state;
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

let wired = false;
export function initSyncStatus(): void {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('online', () => syncStatus.setOnline(true));
  window.addEventListener('offline', () => syncStatus.setOnline(false));
}

// Wrap one Supabase write so the dot reflects it while in flight.
export async function withPending<T>(fn: () => Promise<T>): Promise<T> {
  syncStatus.beginPending();
  try {
    return await fn();
  } finally {
    syncStatus.endPending();
  }
}
