## Overview

A mobile-first food scanning app. Users complete a quick onboarding (goal + body stats), then snap a meal photo OR scan a barcode. The app identifies the food, returns all sorts of nutrition facts, and gives an unmistakable "Eat" / "Skip it" verdict tailored to their goal. All progress is stored locally in the browser — no login.

Visual language follows the chosen **High-Performance Kinetic** direction: near-black background (`#0a0a0a`), lime-yellow accent (`#bef264`), Anton display + Inter body + JetBrains Mono labels, sharp corners, thick block shadows on key CTAs, animated viewfinder.

## Screens & flow

```text
First visit ────► /onboarding (multi-step)
                    1. Goal: Lose / Maintain / Gain / Build muscle / General health
                    2. Stats: sex, age, height, weight, activity level
                    3. Auto-calc daily calorie + macro targets (Mifflin-St Jeor)
                  │
                  ▼
Returning ──────► / (Dashboard)
                    • Header: phase + kcal progress bar
                    • Macro grid (Protein / Carbs / Fat with targets)
                    • Today's meals list
                    • Suggestions feed (Eat more / Avoid)
                    • Sticky "Launch Scanner" FAB + bottom nav
                  │
                  ▼
                  /scan  (camera viewfinder)
                    • Toggle: Photo ⇄ Barcode
                    • Photo: capture frame → POST to AI verdict server fn
                    • Barcode: live decode via @zxing/browser → OpenFoodFacts lookup
                  │
                  ▼
                  /scan/result  (full-screen verdict)
                    • Big lime "BUILD FAST" / neon Yellow "Eat but less" / red "SKIP IT" stamp
                    • Nutrition table + AI reasoning paragraph
                    • [Log to meal] button → returns to dashboard
                  │
                  ▼
                  /history (all logged meals, grouped by day)
                  /coach   (suggestions tailored to goal)
                  /profile (edit goal/stats, reset data)
```

## Tech approach

**Routing (TanStack Start file routes under `src/routes/`):**

- `index.tsx` — Dashboard (redirects to `/onboarding` if no profile in localStorage)
- `onboarding.tsx` — multi-step form
- `scan.tsx` — camera + barcode viewfinder
- `scan.result.tsx` — verdict screen (reads last scan from sessionStorage)
- `history.tsx`, `coach.tsx`, `profile.tsx`

**Local persistence** — single Zustand store (`src/store/app.ts`) backed by `localStorage`:

- `profile` (goal, sex, age, height, weight, activity, computed targets)
- `meals[]` (id, timestamp, name, kcal, protein, carbs, fat, verdict, imageDataUrl)
- Helper: `addMeal`, `resetProfile`, `dailyTotals(date)`

**Photo scanning (AI vision)** — server function `src/lib/scan.functions.ts` calls Lovable AI Gateway with `google/gemini-2.5-flash` (multimodal). Input: base64 image + user goal. Output (structured JSON via tool calling):

```json
{ "name": "Salmon Poke Bowl", "kcal": 642, "protein_g": 38, "carbs_g": 52,
  "fat_g": 18, "verdict": "great" | "ok" | "avoid", "reasoning": "..." }
```

Uses `LOVABLE_API_KEY` (already available — no setup).

**Barcode scanning** — `@zxing/browser` runs entirely client-side via `getUserMedia`. On decode, hit OpenFoodFacts public API (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`) for nutrition; then call a small server fn that asks Gemini for the verdict + reasoning given the goal.

**Suggestions feed** — server function generates a goal-specific list of "eat more / avoid" foods on first dashboard load (cached in localStorage for 24h).

**Camera permission UX** — graceful fallback: if denied, show "Upload photo" file input.

## Design system (`src/styles.css`)

Replace tokens with the chosen palette in `oklch`:

- `--background` near-black, `--foreground` near-white
- `--primary` lime (`#bef264` → oklch), `--primary-foreground` near-black
- `--destructive` red verdict
- `--surface` (`#171717`), `--muted` greys
- Font families wired via `<link>` in `__root.tsx` head: Anton, Inter, JetBrains Mono
- Reusable utility classes: `.animate-scan`, `.animate-enter`, block-shadow CTA pattern

All components built with semantic tokens — no hard-coded hex in JSX.

## Components

- `MacroGrid`, `MacroBar`, `CalorieProgress`
- `MealCard`, `SuggestionRow`
- `ScannerViewfinder` (corner brackets, scan-line animation, mode toggle)
- `VerdictStamp` (rotated lime block with hard shadow)
- `BottomNav` + `ScanFAB` (sticky, shared layout in `__root.tsx`)
- `OnboardingStep` wrapper

## Out of scope (this round)

- Multi-user accounts / cloud sync (local-only chosen)
- Recipe builder, meal planning, water/exercise tracking
- Native iOS/Android camera APIs (web `getUserMedia` only)

## Notes for the user

The AI vision and verdict calls run through Lovable's built-in AI Gateway — no API key setup needed from you. Your data stays in your browser; clearing site data wipes it. If you later want sync across devices, we can add Lovable Cloud accounts as a follow-up.