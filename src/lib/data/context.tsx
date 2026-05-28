'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useEncryption } from '@/lib/encryption/context';
import { useCycles } from '@/hooks/useCycles';
import { useDailyLog } from '@/hooks/useDailyLog';
import { usePrediction } from '@/hooks/usePrediction';
import type { DecryptedCycle, DecryptedDailyLog, PredictionResult, CyclePayload, DailyLogPayload } from '@/types/app';

interface AppData {
  cycles: DecryptedCycle[];
  logs: DecryptedDailyLog[];
  prediction: PredictionResult;
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

  useEffect(() => {
    if (isUnlocked && !initialized.current) {
      initialized.current = true;
      cyclesHook.fetchAll();
      logsHook.fetchAll();
    }
  }, [isUnlocked, cyclesHook.fetchAll, logsHook.fetchAll]);

  const refresh = useCallback(async () => {
    await Promise.all([cyclesHook.fetchAll(), logsHook.fetchAll()]);
  }, [cyclesHook.fetchAll, logsHook.fetchAll]);

  const value = useMemo<AppData>(() => ({
    cycles: cyclesHook.cycles,
    logs: logsHook.logs,
    prediction,
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
    prediction, refresh,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
