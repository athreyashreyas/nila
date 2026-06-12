import type { CyclePhase } from '@/types/app';

export const SYMPTOM_TIPS: Record<string, string> = {
  cramps:              'A heating pad and gentle movement like walking or yoga can ease this.',
  bloating:            'Warm herbal teas and lighter meals tend to help. Avoid excess salt today.',
  headache:            'Stay well hydrated and try to reduce screen time if you can.',
  backache:            'Gentle stretching and heat on your lower back can bring real relief.',
  'breast tenderness': 'A well-fitting, supportive bra and reducing caffeine can help.',
  acne:                'Your skin is more reactive right now, so keep your routine simple and gentle.',
  'mood swings':       'Your nervous system is working hard. Reducing stimulation where possible helps.',
  fatigue:             'Even 10 minutes of rest or a short nap makes a meaningful difference today.',
  nausea:              'Small, frequent meals and ginger tea can settle this.',
  'food cravings':     'Cravings signal what your body needs, so lean into nourishing versions.',
  insomnia:            'Reduce screens an hour before bed and keep your room cool.',
  spotting:            'Spotting can be normal mid-cycle or at the end of a period. Track it.',
  discharge:           'Changes in discharge through your cycle are normal. It can help to note the pattern.',
  'hot flashes':       'Breathable fabrics and a cool drink nearby can make these more manageable.',
  'brain fog':         'Short focused sessions with breaks outperform long stretches when fog hits.',
};

export const PHASE_INSIGHT_TIPS: Record<CyclePhase, string[]> = {
  period: [
    'Your body is doing real work right now. Warmth, rest, and iron-rich foods help.',
    'This is a good time to slow down and let your body lead the pace.',
    'Gentle movement like walking or stretching tends to ease discomfort more than staying still.',
  ],
  follicular: [
    'Your focus and memory tend to sharpen in this phase, a great time to tackle hard things.',
    'New projects and plans started now have a natural momentum behind them.',
    'Your body is building energy reserves. Protein and leafy greens support that.',
  ],
  ovulation: [
    'Your social energy is near its peak, and high-stakes conversations and creative bursts come more easily now.',
    'This is one of the best windows in your cycle for physical performance.',
    'Your skin and hair often look their best around ovulation, so enjoy it.',
  ],
  luteal: [
    'Your intuition tends to be sharper now. Trust what you notice.',
    'This phase can amplify stress, so reducing your load where possible is genuinely useful, not a luxury.',
    'Magnesium-rich foods like dark chocolate and leafy greens can ease luteal symptoms.',
  ],
};
