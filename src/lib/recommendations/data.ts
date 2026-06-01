import type { CyclePhase } from '@/types/app';

export interface FoodRec {
  name: string;
  emoji: string;
  reason: string;
  veg: boolean;
  vegAlt?: { name: string; emoji: string; reason: string };
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
  symptomTriggers: string[];
}

const DB: Record<CyclePhase, PhaseRec> = {
  period: {
    headline: 'Nourish and restore',
    bodyNote: 'Estrogen and progesterone are at their lowest. Fatigue is physiological, not weakness.',
    foods: [
      { name: 'Dark chocolate', emoji: '🍫', reason: 'Magnesium eases cramping and lifts mood', veg: true },
      { name: 'Ginger tea', emoji: '🫖', reason: 'Anti-spasmodic, calms nausea and cramps', veg: true },
      { name: 'Lentils & beans', emoji: '🫘', reason: 'Replenish iron lost during bleeding', veg: true },
      { name: 'Salmon', emoji: '🐟', reason: 'Omega-3s lower prostaglandins (the cramp hormone)', veg: false,
        vegAlt: { name: 'Flaxseeds', emoji: '🌾', reason: 'Plant omega-3s reduce prostaglandins that cause cramping — soak overnight for best absorption' } },
      { name: 'Leafy greens', emoji: '🥬', reason: 'Iron + vitamin C — best absorbed together', veg: true },
      { name: 'Turmeric', emoji: '🌿', reason: 'Curcumin reduces inflammation naturally', veg: true },
      { name: 'Walnuts', emoji: '🥜', reason: 'Omega-3s and magnesium in one easy snack', veg: true },
      { name: 'Chamomile tea', emoji: '🌼', reason: 'Antispasmodic and calms the nervous system', veg: true },
    ],
    lifestyle: 'Rest without guilt. Heat on your lower abdomen genuinely helps. Light walks beat high intensity — protect your energy.',
    avoid: ['Excess caffeine', 'Salty processed snacks', 'Alcohol', 'Iced drinks'],
  },
  follicular: {
    headline: 'Fuel the rising energy',
    bodyNote: 'Estrogen is climbing. Sharper focus, better mood, and returning stamina are all real.',
    foods: [
      { name: 'Eggs', emoji: '🥚', reason: 'Choline supports healthy estrogen metabolism', veg: false,
        vegAlt: { name: 'Edamame', emoji: '🫛', reason: 'Plant protein and natural choline to support healthy estrogen metabolism' } },
      { name: 'Fermented foods', emoji: '🥗', reason: 'Gut bacteria help process rising estrogen', veg: true },
      { name: 'Flaxseeds', emoji: '🌾', reason: 'Lignans gently balance estrogen levels', veg: true },
      { name: 'Berries', emoji: '🫐', reason: 'Antioxidants support follicle development', veg: true },
      { name: 'Quinoa', emoji: '🌱', reason: 'Complex carbs sustain the energy surge', veg: true },
      { name: 'Almonds', emoji: '🥜', reason: 'Vitamin E supports follicle health', veg: true },
      { name: 'Broccoli', emoji: '🥦', reason: 'DIM helps the liver clear excess estrogen', veg: true },
      { name: 'Green tea', emoji: '🍵', reason: 'Light antioxidant boost with less cortisol than coffee', veg: true },
    ],
    lifestyle: 'Great time to begin something new. Your brain is at its clearest — use it for hard thinking and creative projects.',
    avoid: ['Heavily processed foods', 'Excess sugar'],
  },
  ovulation: {
    headline: 'Peak energy — eat to match',
    bodyNote: 'LH surge triggers ovulation. You may feel warm, outgoing, and physically strong.',
    foods: [
      { name: 'Avocado', emoji: '🥑', reason: 'Healthy fats support hormone production', veg: true },
      { name: 'Pomegranate', emoji: '🍎', reason: 'Antioxidants protect the egg during release', veg: true },
      { name: 'Sunflower seeds', emoji: '🌻', reason: 'Selenium and vitamin E for ovulatory health', veg: true },
      { name: 'Asparagus', emoji: '🥦', reason: 'Folate essential for healthy cell development', veg: true },
      { name: 'Citrus fruits', emoji: '🍊', reason: 'Vitamin C for immune and egg health', veg: true },
      { name: 'Lean proteins', emoji: '🥩', reason: 'Sustains peak energy without blood sugar spikes', veg: false,
        vegAlt: { name: 'Paneer or firm tofu', emoji: '🧀', reason: 'Complete protein sustains peak energy without spiking blood sugar' } },
      { name: 'Coconut water', emoji: '🥥', reason: 'Stay hydrated — you\'re running at full capacity', veg: true },
      { name: 'Pumpkin seeds', emoji: '🎃', reason: 'Zinc and iron to support peak output', veg: true },
    ],
    lifestyle: 'High-intensity workouts, big conversations, important decisions — all easier now. Lean in.',
    avoid: ['Skipping meals', 'Excessive alcohol'],
  },
  luteal: {
    headline: 'Steady and grounding',
    bodyNote: 'Progesterone peaks then drops. PMS, mood shifts, and bloating in the second half are your body adjusting.',
    foods: [
      { name: 'Sweet potato', emoji: '🍠', reason: 'Complex carbs ease progesterone-driven cravings', veg: true },
      { name: 'Turkey', emoji: '🍗', reason: 'Tryptophan boosts serotonin as it naturally dips', veg: false,
        vegAlt: { name: 'Cashews', emoji: '🌰', reason: 'Among the highest plant sources of tryptophan — naturally boosts serotonin' } },
      { name: 'Dark chocolate', emoji: '🍫', reason: 'Magnesium and mood support in one', veg: true },
      { name: 'Chickpeas', emoji: '🫘', reason: 'B6 reduces PMS symptoms noticeably', veg: true },
      { name: 'Oats', emoji: '🌾', reason: 'Slow carbs prevent blood sugar crashes', veg: true },
      { name: 'Banana', emoji: '🍌', reason: 'Potassium reduces bloating, B6 lifts mood', veg: true },
      { name: 'Pumpkin seeds', emoji: '🎃', reason: 'Zinc supports progesterone at its peak', veg: true },
      { name: 'Chamomile tea', emoji: '🌼', reason: 'Calms the nervous system as it winds down', veg: true },
    ],
    lifestyle: 'Honour the slower pace. Gentle yoga and creative work thrive here. High intensity can wait.',
    avoid: ['Excess caffeine', 'Alcohol', 'Very salty foods', 'Pushing through exhaustion'],
  },
};

const SYMPTOM_PRIORITY: Record<string, string[]> = {
  'cramps':            ['Dark chocolate', 'Ginger tea', 'Salmon', 'Flaxseeds', 'Turmeric', 'Chamomile tea', 'Walnuts'],
  'bloating':          ['Ginger tea', 'Chamomile tea', 'Banana', 'Asparagus'],
  'fatigue':           ['Lentils & beans', 'Leafy greens', 'Oats', 'Quinoa', 'Edamame'],
  'mood swings':       ['Dark chocolate', 'Turkey', 'Cashews', 'Chickpeas', 'Banana', 'Sweet potato'],
  'headache':          ['Ginger tea', 'Green tea', 'Leafy greens', 'Coconut water'],
  'nausea':            ['Ginger tea', 'Chamomile tea'],
  'food cravings':     ['Dark chocolate', 'Oats', 'Sweet potato', 'Banana'],
  'breast tenderness': ['Flaxseeds', 'Leafy greens', 'Green tea'],
  'backache':          ['Salmon', 'Flaxseeds', 'Turmeric', 'Walnuts', 'Ginger tea'],
  'insomnia':          ['Chamomile tea', 'Turkey', 'Cashews', 'Banana'],
  'acne':              ['Broccoli', 'Berries', 'Leafy greens', 'Green tea'],
  'brain fog':         ['Eggs', 'Edamame', 'Avocado', 'Berries', 'Green tea'],
  'hot flashes':       ['Flaxseeds', 'Leafy greens', 'Coconut water'],
  'spotting':          ['Lentils & beans', 'Leafy greens', 'Salmon', 'Flaxseeds'],
};

export function getRecommendations(phase: CyclePhase, loggedSymptoms: string[], isVeg = false): ActiveRecs {
  const rec = DB[phase];

  // Apply veg substitutions
  const foods: FoodRec[] = rec.foods.map(f => {
    if (isVeg && !f.veg && f.vegAlt) {
      return { name: f.vegAlt.name, emoji: f.vegAlt.emoji, reason: f.vegAlt.reason, veg: true };
    }
    return f;
  });

  const boosted = new Set<string>();
  const triggeredSymptoms: string[] = [];

  for (const symptom of loggedSymptoms) {
    const priorityFoods = SYMPTOM_PRIORITY[symptom];
    if (priorityFoods?.length) {
      triggeredSymptoms.push(symptom);
      priorityFoods.forEach(f => boosted.add(f));
    }
  }

  const sorted = [...foods].sort((a, b) => {
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
