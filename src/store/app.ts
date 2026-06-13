import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Goal = "lose" | "maintain" | "gain" | "muscle" | "health";
export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Verdict = "great" | "ok" | "avoid";

export interface Profile {
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  // computed targets
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Meal {
  id: string;
  timestamp: number;
  name: string;
  // FINAL logged values (already multiplied by servings)
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  // portion info
  servings: number;
  servingDescription?: string;
  verdict: Verdict;
  reasoning: string;
  confidence?: "low" | "medium" | "high";
  imageDataUrl?: string;
  source: "photo" | "barcode";
}

export const GOAL_LABEL: Record<Goal, string> = {
  lose: "Cut Fat",
  maintain: "Maintain",
  gain: "Bulk Up",
  muscle: "Build Muscle",
  health: "General Health",
};

const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function computeTargets(
  sex: Sex,
  age: number,
  heightCm: number,
  weightKg: number,
  activity: Activity,
  goal: Goal,
) {
  // Mifflin–St Jeor
  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const tdee = bmr * ACTIVITY_FACTOR[activity];
  const adj =
    goal === "lose" ? -500 : goal === "gain" ? 400 : goal === "muscle" ? 300 : 0;
  const kcalTarget = Math.round(tdee + adj);

  const proteinPerKg = goal === "muscle" || goal === "gain" ? 2.0 : goal === "lose" ? 1.8 : 1.4;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((kcalTarget * 0.27) / 9);
  const carbsG = Math.round((kcalTarget - proteinG * 4 - fatG * 9) / 4);

  return { kcalTarget, proteinG, carbsG, fatG };
}

interface AppState {
  profile: Profile | null;
  meals: Meal[];
  setProfile: (p: Profile) => void;
  resetProfile: () => void;
  addMeal: (m: Meal) => void;
  removeMeal: (id: string) => void;
  clearAll: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      meals: [],
      setProfile: (profile) => set({ profile }),
      resetProfile: () => set({ profile: null }),
      addMeal: (meal) => set((s) => ({ meals: [meal, ...s.meals] })),
      removeMeal: (id) => set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),
      clearAll: () => set({ profile: null, meals: [] }),
    }),
    { name: "fuelscan-app" },
  ),
);

export function todaysMeals(meals: Meal[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return meals.filter((m) => m.timestamp >= start.getTime());
}

export function dailyTotals(meals: Meal[]) {
  return todaysMeals(meals).reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
