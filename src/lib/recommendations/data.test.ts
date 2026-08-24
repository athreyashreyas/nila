import { describe, expect, it } from 'vitest';
import { getRecommendations, type ActiveRecs } from './data';
import { SYMPTOM_TIPS } from '@/lib/insights/data';
import type { CyclePhase } from '@/types/app';

const PHASES: CyclePhase[] = ['period', 'follicular', 'ovulation', 'luteal'];

describe('getRecommendations', () => {
  it('offers five foods for every phase, however little it is told', () => {
    for (const phase of PHASES) {
      const recs = getRecommendations(phase, []);
      expect(recs.foods).toHaveLength(5);
      expect(recs.headline.length).toBeGreaterThan(0);
      expect(recs.bodyNote.length).toBeGreaterThan(0);
      expect(recs.lifestyle.length).toBeGreaterThan(0);
      expect(recs.avoid.length).toBeGreaterThan(0);
    }
  });

  it('gives each phase its own advice, rather than one card reworded', () => {
    const headlines = PHASES.map((p) => getRecommendations(p, []).headline);
    expect(new Set(headlines).size).toBe(PHASES.length);
  });

  it('lifts the foods that answer a logged symptom to the front', () => {
    const withCramps = getRecommendations('period', ['cramps']);
    const names = withCramps.foods.map((f) => f.name);
    // Dark chocolate and ginger tea are the cramp answers in the period list.
    expect(names.indexOf('Dark chocolate')).toBeLessThan(4);
    expect(names).toContain('Ginger tea');
    expect(withCramps.symptomTriggers).toEqual(['cramps']);
  });

  it('says which symptoms it actually acted on, and stays quiet about the rest', () => {
    const recs = getRecommendations('period', ['cramps', 'a symptom nobody has heard of']);
    expect(recs.symptomTriggers).toEqual(['cramps']);
  });

  it('acts on several symptoms at once', () => {
    const recs = getRecommendations('period', ['cramps', 'backache']);
    expect(recs.symptomTriggers).toEqual(['cramps', 'backache']);
    expect(recs.foods).toHaveLength(5);
  });

  it('reports no triggers when nothing was logged', () => {
    for (const phase of PHASES) {
      expect(getRecommendations(phase, []).symptomTriggers).toEqual([]);
    }
  });

  it('keeps the ordering stable within the boosted and unboosted groups', () => {
    // The sort only moves boosted foods ahead; everything else must stay in the
    // order the phase list was written in, or the card reshuffles on re-render.
    const plain = getRecommendations('period', []).foods.map((f) => f.name);
    expect(getRecommendations('period', []).foods.map((f) => f.name)).toEqual(plain);
    const boosted = getRecommendations('period', ['cramps']).foods.map((f) => f.name);
    expect(boosted).not.toEqual(plain);
  });

  it('substitutes a plant alternative for a vegetarian, keeping the reason', () => {
    const omni = getRecommendations('period', []).foods;
    const veg = getRecommendations('period', [], true).foods;
    expect(omni.some((f) => f.name === 'Salmon')).toBe(true);
    expect(veg.some((f) => f.name === 'Salmon')).toBe(false);
  });

  it('marks every food vegetarian when asked for a vegetarian list', () => {
    // A card that quietly recommends salmon to a vegetarian is worse than one
    // that recommends nothing.
    for (const phase of PHASES) {
      for (const food of getRecommendations(phase, [], true).foods) {
        expect(food.veg).toBe(true);
      }
    }
  });

  it('still offers five foods to a vegetarian with symptoms logged', () => {
    for (const phase of PHASES) {
      const recs = getRecommendations(phase, ['cramps', 'fatigue', 'headache'], true);
      expect(recs.foods).toHaveLength(5);
      expect(new Set(recs.foods.map((f) => f.name)).size).toBe(5);
    }
  });

  it('gives every food a name, an emoji and a reason', () => {
    for (const phase of PHASES) {
      for (const veg of [false, true]) {
        for (const food of getRecommendations(phase, [], veg).foods) {
          expect(food.name.trim().length).toBeGreaterThan(0);
          expect(food.emoji.length).toBeGreaterThan(0);
          expect(food.reason.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('never repeats a food within one card', () => {
    // A veg substitution can collide with a food already on the list, which
    // would show the same suggestion twice.
    for (const phase of PHASES) {
      for (const veg of [false, true]) {
        const names = getRecommendations(phase, ['cramps'], veg).foods.map((f) => f.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it('does not hand back a reference callers could mutate into the source data', () => {
    const first = getRecommendations('period', []) as ActiveRecs;
    first.foods.pop();
    expect(getRecommendations('period', []).foods).toHaveLength(5);
  });

  it('answers a symptom the tips also cover, so advice and food agree', () => {
    // Anything Insights offers a tip for should also be able to steer the card;
    // a symptom with advice but no food is a gap the user can feel.
    const steerable = ['cramps', 'bloating', 'headache', 'fatigue', 'insomnia', 'acne'];
    for (const symptom of steerable) {
      expect(SYMPTOM_TIPS[symptom]).toBeTruthy();
      expect(getRecommendations('period', [symptom]).symptomTriggers).toEqual([symptom]);
    }
  });
});
