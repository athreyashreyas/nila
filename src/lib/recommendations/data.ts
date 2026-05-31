import type { CyclePhase } from '@/types/app';

export interface FoodRec {
  name: string;
  emoji: string;
  reason: string;
}

export interface PhaseRec {
  headline: string;
  bodyNote: string;
  foods: FoodRec[];
  lifestyle: string;
  avoid: string[];
}

export interface ActiveRecs extends PhaseRec {
  foods: FoodRec[];
  symptomTriggers: string[]; // which logged symptoms shaped this list
}

const DB: Record<CyclePhase, PhaseRec> = {
  period: {
    headline: 'Nourish and restore',
    bodyNote: 'Estrogen and progesterone are at their lowest. Fatigue is physiological, not weakness.',
    foods: [
      { name: 'Dark chocolate', emoji: '🍫', reason: 'Magnesium eases cramping and lifts mood' },
      { name: 'Ginger tea', emoji: '🫖', reason: 'Anti-spasmodic, calms nausea and cramps' },
      { name: 'Lentils & beans', emoji: '🫘', reason: 'Replenish iron lost during bleeding' },
      { name: 'Salmon', emoji: '🐟', reason: 'Omega-3s lower prostaglandins (the cramp hormone)' },
      { name: 'Leafy greens', emoji: '🥬', reason: 'Iron + vitamin C — best absorbed together' },
      { name: 'Turmeric', emoji: '🌿', reason: 'Curcumin reduces inflammation naturally' },
      { name: 'Walnuts', emoji: '🥜', reason: 'Omega-3s and magnesium in one easy snack' },
      { name: 'Chamomile tea', emoji: '🌼', reason: 'Antispasmodic and calms the nervous system' },
    ],
    lifestyle: 'Rest without guilt. Heat on your lower abdomen genuinely helps. Light walks beat high intensity — protect your energy.',
    avoid: ['Excess caffeine', 'Salty processed snacks', 'Alcohol', 'Iced drinks'],
  },
  follicular: {
    headline: 'Fuel the rising energy',
    bodyNote: 'Estrogen is climbing. Sharper focus, better mood, and returning stamina are all real.',
    foods: [
      { name: 'Eggs', emoji: '🥚', reason: 'Choline supports healthy estrogen metabolism' },
      { name: 'Fermented foods', emoji: '🥗', reason: 'Gut bacteria help process rising estrogen' },
      { name: 'Flaxseeds', emoji: '🌾', reason: 'Lignans gently balance estrogen levels' },
      { name: 'Berries', emoji: '🫐', reason: 'Antioxidants support follicle development' },
      { name: 'Quinoa', emoji: '🌱', reason: 'Complex carbs sustain the energy surge' },
      { name: 'Almonds', emoji: '🥜', reason: 'Vitamin E supports follicle health' },
      { name: 'Broccoli', emoji: '🥦', reason: 'DIM helps the liver clear excess estrogen' },
      { name: 'Green tea', emoji: '🍵', reason: 'Light antioxidant boost with less cortisol than coffee' },
    ],
    lifestyle: 'Great time to begin something new. Your brain is at its clearest — use it for hard thinking and creative projects.',
    avoid: ['Heavily processed foods', 'Excess sugar'],
  },
  ovulation: {
    headline: 'Peak energy — eat to match',
    bodyNote: 'LH surge triggers ovulation. You may feel warm, outgoing, and physically strong.',
    foods: [
      { name: 'Avocado', emoji: '🥑', reason: 'Healthy fats support hormone production' },
      { name: 'Pomegranate', emoji: '🍎', reason: 'Antioxidants protect the egg during release' },
      { name: 'Sunflower seeds', emoji: '🌻', reason: 'Selenium and vitamin E for ovulatory health' },
      { name: 'Asparagus', emoji: '🥦', reason: 'Folate essential for healthy cell development' },
      { name: 'Citrus fruits', emoji: '🍊', reason: 'Vitamin C for immune and egg health' },
      { name: 'Lean proteins', emoji: '🥩', reason: 'Sustains peak energy without blood sugar spikes' },
      { name: 'Coconut water', emoji: '🥥', reason: 'Stay hydrated — you\'re running at full capacity' },
      { name: 'Pumpkin seeds', emoji: '🎃', reason: 'Zinc and iron to support peak output' },
    ],
    lifestyle: 'High-intensity workouts, big conversations, important decisions — all easier now. Lean in.',
    avoid: ['Skipping meals', 'Excessive alcohol'],
  },
  luteal: {
    headline: 'Steady and grounding',
    bodyNote: 'Progesterone peaks then drops. PMS, mood shifts, and bloating in the second half are your body adjusting.',
    foods: [
      { name: 'Sweet potato', emoji: '🍠', reason: 'Complex carbs ease progesterone-driven cravings' },
      { name: 'Turkey', emoji: '🍗', reason: 'Tryptophan boosts serotonin as it naturally dips' },
      { name: 'Dark chocolate', emoji: '🍫', reason: 'Magnesium and mood support in one' },
      { name: 'Chickpeas', emoji: '🫘', reason: 'B6 reduces PMS symptoms noticeably' },
      { name: 'Oats', emoji: '🌾', reason: 'Slow carbs prevent blood sugar crashes' },
      { name: 'Banana', emoji: '🍌', reason: 'Potassium reduces bloating, B6 lifts mood' },
      { name: 'Pumpkin seeds', emoji: '🎃', reason: 'Zinc supports progesterone at its peak' },
      { name: 'Chamomile tea', emoji: '🌼', reason: 'Calms the nervous system as it winds down' },
    ],
    lifestyle: 'Honour the slower pace. Journaling, gentle yoga, and creative work thrive here. High intensity can wait.',
    avoid: ['Excess caffeine', 'Alcohol', 'Very salty foods', 'Pushing through exhaustion'],
  },
};

// Which foods to boost to the top for each symptom
const SYMPTOM_PRIORITY: Record<string, string[]> = {
  'cramps':            ['Dark chocolate', 'Ginger tea', 'Salmon', 'Turmeric', 'Chamomile tea', 'Walnuts'],
  'bloating':          ['Ginger tea', 'Chamomile tea', 'Chamomile', 'Banana', 'Asparagus'],
  'fatigue':           ['Lentils & beans', 'Leafy greens', 'Oats', 'Quinoa', 'Turkey', 'Eggs'],
  'mood swings':       ['Dark chocolate', 'Turkey', 'Chickpeas', 'Banana', 'Sweet potato'],
  'headache':          ['Ginger tea', 'Green tea', 'Leafy greens', 'Coconut water'],
  'nausea':            ['Ginger tea', 'Chamomile tea'],
  'food cravings':     ['Dark chocolate', 'Oats', 'Sweet potato', 'Banana'],
  'breast tenderness': ['Flaxseeds', 'Leafy greens', 'Green tea'],
  'backache':          ['Salmon', 'Turmeric', 'Walnuts', 'Ginger tea'],
  'insomnia':          ['Chamomile tea', 'Turkey', 'Banana'],
  'acne':              ['Broccoli', 'Berries', 'Leafy greens', 'Green tea'],
  'brain fog':         ['Eggs', 'Avocado', 'Berries', 'Green tea'],
  'hot flashes':       ['Flaxseeds', 'Leafy greens', 'Coconut water'],
  'spotting':          ['Lentils & beans', 'Leafy greens', 'Salmon'],
};

export function getRecommendations(phase: CyclePhase, loggedSymptoms: string[]): ActiveRecs {
  const rec = DB[phase];
  const boosted = new Set<string>();
  const triggeredSymptoms: string[] = [];

  for (const symptom of loggedSymptoms) {
    const foods = SYMPTOM_PRIORITY[symptom];
    if (foods?.length) {
      triggeredSymptoms.push(symptom);
      foods.forEach(f => boosted.add(f));
    }
  }

  const sorted = [...rec.foods].sort((a, b) => {
    const aB = boosted.has(a.name) ? 0 : 1;
    const bB = boosted.has(b.name) ? 0 : 1;
    return aB - bB;
  });

  return {
    ...rec,
    foods: sorted.slice(0, 5),
    symptomTriggers: triggeredSymptoms,
  };
}
