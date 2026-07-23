// ─── Encryption ───────────────────────────────────────────────

export interface EncryptedBlob {
  ciphertext: string; // base64url AES-256-GCM output (includes 16-byte auth tag)
  iv: string;         // base64url 12-byte random IV
}

export interface ProfileKeyData {
  key_salt: string;              // base64url, 32 bytes
  wrapped_key: string;           // base64url, AES-KW output
  recovery_wrapped_key?: string; // base64url, optional until set
  pbkdf2_iterations: number;
}

// ─── Cycle data (decrypted) ───────────────────────────────────

export type FlowIntensity = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export interface CyclePayload {
  periodStart: string;           // ISO date string e.g. "2025-05-01"
  periodEnd: string | null;      // ISO date string, null if period is ongoing
  flowIntensity: FlowIntensity;
  notes: string;
}

export interface DecryptedCycle {
  id: string;                    // Supabase row UUID
  payload: CyclePayload;
  createdAt: string;
}

// ─── Daily log data (decrypted) ──────────────────────────────

export type MoodLevel = 'great' | 'good' | 'okay' | 'low' | 'low-energy';

export interface DailyLogPayload {
  date: string;                  // ISO date string
  mood: MoodLevel | null;
  energy: 1 | 2 | 3 | 4 | 5 | null;
  symptoms: string[];
  notes: string;
  flow: FlowIntensity;
}

export interface DecryptedDailyLog {
  id: string;                    // Supabase row UUID
  payload: DailyLogPayload;
  createdAt: string;
}

// ─── Phase prediction ─────────────────────────────────────────

export type CyclePhase = 'period' | 'follicular' | 'ovulation' | 'luteal';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface PredictionResult {
  currentPhase: CyclePhase;
  dayInPhase: number;                  // 1-indexed
  nextPeriodDate: Date;
  nextPeriodConfidenceRange: number;   // ± this many days
  ovulationWindowStart: Date;
  ovulationWindowEnd: Date;
  estimatedCycleLength: number;        // days
  estimatedPeriodLength: number;       // days
  confidence: ConfidenceLevel;
  daysUntilNextPeriod: number;         // negative = overdue
  hasData: boolean;                    // false when no cycles have been logged yet
}

// ─── UI option lists (single source of truth for forms) ──────

export const MOODS: { value: MoodLevel; emoji: string; label: string }[] = [
  { value: 'great',      emoji: '😊', label: 'Great' },
  { value: 'good',       emoji: '🙂', label: 'Good' },
  { value: 'okay',       emoji: '😐', label: 'Okay' },
  { value: 'low',        emoji: '😔', label: 'Low' },
  { value: 'low-energy', emoji: '😴', label: 'Tired' },
];

// Derived lookups so screens never redefine their own mood emoji/label maps
// (which would silently drift from MOODS above).
export const MOOD_EMOJI = Object.fromEntries(MOODS.map((m) => [m.value, m.emoji])) as Record<MoodLevel, string>;
export const MOOD_LABEL = Object.fromEntries(MOODS.map((m) => [m.value, m.label])) as Record<MoodLevel, string>;

export const FLOWS: { value: FlowIntensity; label: string }[] = [
  { value: 'none',     label: 'None' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light',    label: 'Light' },
  { value: 'medium',   label: 'Medium' },
  { value: 'heavy',    label: 'Heavy' },
];

// ─── Symptoms catalogue ───────────────────────────────────────

export const SYMPTOMS = [
  'cramps', 'bloating', 'headache', 'backache', 'breast tenderness',
  'acne', 'mood swings', 'fatigue', 'nausea', 'food cravings',
  'insomnia', 'spotting', 'discharge', 'hot flashes', 'brain fog',
] as const;

export type Symptom = typeof SYMPTOMS[number];

// ─── Phase metadata ───────────────────────────────────────────

// Colours are the Quiet Paper phase tokens, so every theme (light and dark)
// re-tints them from one place in globals.css. Because they are CSS variables
// rather than hex, use `tint()` below to build a translucent version instead of
// appending a hex alpha suffix.
export const PHASE_META: Record<CyclePhase, { label: string; color: string; description: string }> = {
  period: {
    label: 'Period',
    color: 'var(--color-phase-period)',
    description: 'Your body is working hard right now, so be gentle with yourself. Resting isn\'t laziness, it\'s exactly what you need.',
  },
  follicular: {
    label: 'Follicular',
    color: 'var(--color-phase-follicular)',
    description: 'New energy is quietly building. A good time to begin things.',
  },
  ovulation: {
    label: 'Ovulation',
    color: 'var(--color-phase-ovulation)',
    description: 'You\'re glowing at your peak. Soak up all this warmth and clarity while it\'s here.',
  },
  luteal: {
    label: 'Luteal',
    color: 'var(--color-phase-luteal)',
    description: 'Soften your pace. Your body is winding down, beautifully.',
  },
};

/** A translucent wash of any colour, including a CSS variable. `pct` is 0..100. */
export function tint(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}
