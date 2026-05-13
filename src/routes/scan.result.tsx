import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp, type Meal, type Verdict } from "../store/app";

export const Route = createFileRoute("/scan/result")({
  component: ScanResult,
});

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; bg: string; text: string; rotate: string }
> = {
  great: {
    label: "Build Fast",
    bg: "bg-primary",
    text: "text-primary-foreground",
    rotate: "-rotate-3",
  },
  ok: {
    label: "Eat in Moderation",
    bg: "bg-warning",
    text: "text-warning-foreground",
    rotate: "rotate-1",
  },
  avoid: {
    label: "Skip It",
    bg: "bg-destructive",
    text: "text-destructive-foreground",
    rotate: "rotate-2",
  },
};

function ScanResult() {
  const navigate = useNavigate();
  const addMeal = useApp((s) => s.addMeal);
  const [meal, setMeal] = useState<Meal | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("fuelscan-pending");
    if (!raw) {
      navigate({ to: "/" });
      return;
    }
    setMeal(JSON.parse(raw) as Meal);
  }, [navigate]);

  if (!meal) return null;

  const cfg = VERDICT_CONFIG[meal.verdict];

  const log = () => {
    addMeal(meal);
    sessionStorage.removeItem("fuelscan-pending");
    navigate({ to: "/" });
  };

  const discard = () => {
    sessionStorage.removeItem("fuelscan-pending");
    navigate({ to: "/scan" });
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/scan" className="font-mono text-xs uppercase text-muted-foreground">
          ← Retake
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Analysis
        </div>
        <div className="w-12" />
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 space-y-8">
        {/* Hero / verdict */}
        <div className="relative aspect-[4/5] bg-surface overflow-hidden animate-enter">
          {meal.imageDataUrl ? (
            <img
              src={meal.imageDataUrl}
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display text-6xl text-muted-foreground italic">
              {meal.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Verdict stamp */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className={`${cfg.bg} ${cfg.text} ${cfg.rotate} font-display text-4xl sm:text-5xl px-6 py-2 shadow-block-lg uppercase whitespace-nowrap`}
            >
              {cfg.label}
            </div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 inset-x-0 p-5">
            <h1 className="font-display text-2xl uppercase tracking-tight text-white">
              {meal.name}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60 mt-1">
              Source: {meal.source}
            </p>
          </div>
        </div>

        {/* Macros */}
        <div className="bg-surface p-6 animate-enter">
          <div className="flex justify-between items-end mb-6">
            <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
              Estimated nutrition
            </span>
            <div className="text-right">
              <p className="font-display text-4xl text-primary leading-none">{meal.kcal}</p>
              <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1">kcal</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <MacroStat label="Protein" value={meal.protein} />
            <MacroStat label="Carbs" value={meal.carbs} />
            <MacroStat label="Fat" value={meal.fat} />
          </div>
        </div>

        {/* Reasoning */}
        <div className="bg-surface/50 border-l-2 border-primary p-5 animate-enter">
          <p className="font-mono text-[10px] uppercase text-primary tracking-widest mb-2">
            Coach says
          </p>
          <p className="text-sm leading-relaxed">{meal.reasoning}</p>
        </div>
      </main>

      {/* Sticky actions */}
      <footer className="fixed bottom-0 inset-x-0 bg-background border-t border-border px-6 py-4 flex gap-3">
        <button
          onClick={discard}
          className="px-6 py-3 border border-border font-bold text-sm uppercase"
        >
          Discard
        </button>
        <button
          onClick={log}
          className="flex-1 bg-primary text-primary-foreground py-3 font-display text-xl uppercase italic shadow-block active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        >
          Log meal →
        </button>
      </footer>
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {Math.round(value)}
        <span className="text-sm text-muted-foreground">g</span>
      </p>
    </div>
  );
}
