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
}

// ─── Symptoms catalogue ───────────────────────────────────────

export const SYMPTOMS = [
  'cramps', 'bloating', 'headache', 'backache', 'breast tenderness',
  'acne', 'mood swings', 'fatigue', 'nausea', 'food cravings',
  'insomnia', 'spotting', 'discharge', 'hot flashes', 'brain fog',
] as const;

export type Symptom = typeof SYMPTOMS[number];

// ─── Phase metadata ───────────────────────────────────────────

export const PHASE_META: Record<CyclePhase, { label: string; color: string; description: string }> = {
  period: {
    label: 'Period',
    color: '#c084fc',   // soft purple
    description: 'Rest and be gentle with yourself.',
  },
  follicular: {
    label: 'Follicular',
    color: '#86efac',   // soft green
    description: 'Energy returning. Good time to start new things.',
  },
  ovulation: {
    label: 'Ovulation',
    color: '#fde68a',   // warm yellow
    description: 'Peak energy. You may feel social and confident.',
  },
  luteal: {
    label: 'Luteal',
    color: '#93c5fd',   // soft blue
    description: 'Winding down. Honour the need for more rest.',
  },
};
