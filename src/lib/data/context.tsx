'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useEncryption } from '@/lib/encryption/context';
import { useCycles } from '@/hooks/useCycles';
import { useDailyLog } from '@/hooks/useDailyLog';
import { usePrediction } from '@/hooks/usePrediction';
import { getSupabaseClient } from '@/lib/supabase/client';
import { restoreSnapshot, saveSnapshotFromCaches } from '@/lib/data/snapshot';
import { initOutbox, flushOutbox } from '@/lib/data/outbox';
import { startFeedbackOutbox } from '@/lib/data/feedbackOutbox';
import { initSyncStatus } from '@/lib/sync/status';
import type { DecryptedCycle, DecryptedDailyLog, PredictionResult, CyclePayload, DailyLogPayload } from '@/types/app';

interface AppData {
  cycles: DecryptedCycle[];
  logs: DecryptedDailyLog[];
  prediction: PredictionResult;
  isReady: boolean;
  cyclesLoading: boolean;
  logsLoading: boolean;
  addCycle: (payload: CyclePayload) => Promise<void>;
  updateCycle: (id: string, payload: CyclePayload) => Promise<void>;
  deleteCycle: (id: string) => Promise<void>;
  upsertLog: (payload: DailyLogPayload) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { isUnlocked } = useEncryption();
  const cyclesHook = useCycles();
  const logsHook = useDailyLog();
  const prediction = usePrediction(cyclesHook.cycles);
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const { fetchAll: fetchCycles, hydrate: hydrateCycles } = cyclesHook;
  const { fetchAll: fetchLogs, hydrate: hydrateLogs } = logsHook;

  // Fetch both tables from the server, then persist the (decrypt-cached) result to
  // the local snapshot so the next cold load is instant.
  const syncAll = useCallback(async () => {
    await Promise.all([fetchCycles(), fetchLogs()]);
    void saveSnapshotFromCaches();
  }, [fetchCycles, fetchLogs]);

  useEffect(() => {
    if (isUnlocked && !initialized.current) {
      initialized.current = true;
      // Bring up the sync status listeners and drain any writes that were queued
      // offline in a previous session before we reconcile from the server.
      initSyncStatus();
      initOutbox();
      void flushOutbox();
      (async () => {
        // Instant cold-load: paint from the local snapshot first, then reconcile
        // from the server in the background (decrypt-free for unchanged rows).
        const snap = await restoreSnapshot();
        if (snap) {
          hydrateCycles(snap.cycles);
          hydrateLogs(snap.logs);
          setIsReady(true);
        }
        await syncAll().finally(() => setIsReady(true));
      })();
    }
  }, [isUnlocked, syncAll, hydrateCycles, hydrateLogs]);

  const refresh = useCallback(async () => {
    await syncAll();
  }, [syncAll]);

  // Messages written in Settings ride their own queue. It lives here rather than
  // in the sheet so a message written offline still goes out on the next
  // connection, whether or not Settings is ever opened again.
  useEffect(() => {
    if (!isUnlocked) return;
    return startFeedbackOutbox();
  }, [isUnlocked]);

  // Re-sync whenever the tab/app comes back into view (covers iPhone ↔ iPad state drift)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && initialized.current) {
        void syncAll();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [syncAll]);

  // Push sync: a Realtime change on another device refetches immediately instead of
  // waiting for this device to background/foreground or pull-to-refresh.
  useEffect(() => {
    if (!isUnlocked) return;
    const db = getSupabaseClient();
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => { void syncAll(); }, 400);
    };

    let channel: ReturnType<typeof db.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user || cancelled) return;
      channel = db
        .channel('app-data-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles', filter: `user_id=eq.${user.id}` }, debouncedRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs', filter: `user_id=eq.${user.id}` }, debouncedRefresh)
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (debounceId) clearTimeout(debounceId);
      if (channel) db.removeChannel(channel);
    };
  }, [isUnlocked, syncAll]);

  const value = useMemo<AppData>(() => ({
    cycles: cyclesHook.cycles,
    logs: logsHook.logs,
    prediction,
    isReady,
    cyclesLoading: cyclesHook.loading,
    logsLoading: logsHook.loading,
    addCycle: cyclesHook.addCycle,
    updateCycle: cyclesHook.updateCycle,
    deleteCycle: cyclesHook.deleteCycle,
    upsertLog: logsHook.upsertLog,
    deleteLog: logsHook.deleteLog,
    refresh,
  }), [
    cyclesHook.cycles, cyclesHook.loading, cyclesHook.addCycle, cyclesHook.updateCycle, cyclesHook.deleteCycle,
    logsHook.logs, logsHook.loading, logsHook.upsertLog, logsHook.deleteLog,
    prediction, isReady, refresh,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
