'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppData } from '@/lib/data/context';
import { Toast, useToast } from '@/components/ui/Toast';
import { SYMPTOMS, MOODS, FLOWS } from '@/types/app';
import type { MoodLevel, FlowIntensity } from '@/types/app';

export default function JournalDatePage() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const { logs, upsertLog, deleteLog } = useAppData();
  const { toastMsg, showToast } = useToast();

  const existing = logs.find((l) => l.payload.date === date);

  const [mood, setMood] = useState<MoodLevel | null>(existing?.payload.mood ?? null);
  const [flow, setFlow] = useState<FlowIntensity>(existing?.payload.flow ?? 'none');
  const [symptoms, setSymptoms] = useState<string[]>(existing?.payload.symptoms ?? []);
  const [notes, setNotes] = useState(existing?.payload.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Key on the log id, not the object: a background refetch (realtime / visibility)
  // rebuilds the logs array with new identities, and depending on the object here
  // would reset the form mid-edit and wipe what the user is typing.
  useEffect(() => {
    if (existing) {
      setMood(existing.payload.mood);
      setFlow(existing.payload.flow);
      setSymptoms(existing.payload.symptoms);
      setNotes(existing.payload.notes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSave() {
    if (!mood) return;
    setSaving(true);
    try {
      await upsertLog({ date, mood, energy: existing?.payload.energy ?? null, symptoms, flow, notes });
      showToast(existing ? 'Entry updated ✓' : 'Entry saved ✓');
      setTimeout(() => router.back(), 700);
    } catch {
      showToast('Save failed, try again');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setDeleting(true);
    try {
      await deleteLog(existing.id);
      router.back();
    } finally {
      setDeleting(false);
    }
  }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="px-5 pt-4 pb-28 flex flex-col gap-5">
      <Toast message={toastMsg ?? ''} visible={!!toastMsg} />
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => router.back()} className="text-xl" style={{ color: 'var(--color-accent)' }}>‹</button>
        <div>
          <h1 className="text-xl font-bold">Journal</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-foreground-muted)' }}>{displayDate}</p>
        </div>
        {existing && (
          <button onClick={handleDelete} disabled={deleting} className="ml-auto text-xs opacity-40 hover:opacity-70">
            {deleting ? '…' : 'Delete'}
          </button>
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--color-foreground-muted)' }}>Mood</p>
        <div className="flex gap-2">
          {MOODS.map(({ value, emoji, label }) => (
            <button key={value} onClick={() => setMood(value)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-sm)] text-xl transition-all"
              style={{
                background: 'var(--color-surface)',
                boxShadow: mood === value ? 'inset 0 0 0 2px var(--color-accent)' : 'none',
                opacity: mood && mood !== value ? 0.45 : 1,
              }}>
              {emoji}
              <span className="text-[9px] font-semibold" style={{ color: 'var(--color-foreground-muted)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--color-foreground-muted)' }}>Flow</p>
        <div className="flex gap-1.5">
          {FLOWS.map(({ value, label }) => (
            <button key={value} onClick={() => setFlow(value)}
              className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-all"
              style={{
                background: 'var(--color-surface)',
                boxShadow: flow === value ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                opacity: flow !== value ? 0.55 : 1,
                color: flow === value ? 'var(--color-accent)' : undefined,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--color-foreground-muted)' }}>Symptoms</p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => (
            <button key={s} onClick={() => toggleSymptom(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: symptoms.includes(s) ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                boxShadow: symptoms.includes(s) ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                color: symptoms.includes(s) ? 'var(--color-accent)' : undefined,
                opacity: !symptoms.includes(s) ? 0.6 : 1,
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--color-foreground-muted)' }}>Notes</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How was your day…"
          rows={4}
          className="w-full px-4 py-3 rounded-[var(--radius-sm)] text-sm resize-none outline-none"
          style={{
            background: 'var(--color-surface)',
            boxShadow: 'inset 0 0 0 1.5px var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        />
      </div>

      <button onClick={handleSave} disabled={!mood || saving}
        className="w-full py-3.5 rounded-full text-sm font-semibold disabled:opacity-40"
        style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
        {saving ? 'Saving…' : existing ? 'Update entry' : 'Save entry'}
      </button>
    </div>
  );
}
