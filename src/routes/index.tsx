import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { dailyTotals, GOAL_LABEL, todaysMeals, useApp } from "../store/app";
import { getSuggestions, type Suggestions } from "../lib/scan.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const profile = useApp((s) => s.profile);
  const meals = useApp((s) => s.meals);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  const totals = useMemo(() => dailyTotals(meals), [meals]);
  const today = useMemo(() => todaysMeals(meals), [meals]);

  if (!profile) return null;

  const kcalPct = Math.min(100, (totals.kcal / profile.kcalTarget) * 100);

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border px-6 py-4 flex justify-between items-end">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary block mb-1">
            Current Phase
          </span>
          <h1 className="font-display text-2xl uppercase leading-none tracking-tight">
            {GOAL_LABEL[profile.goal]}
          </h1>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-muted-foreground">
            {totals.kcal.toLocaleString()} / {profile.kcalTarget.toLocaleString()} kcal
          </span>
          <div className="h-1 w-32 bg-white/10 mt-1 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${kcalPct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-8 space-y-12">
        {/* Daily engine */}
        <section className="animate-enter">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-3xl uppercase tracking-tighter italic">
              Daily Engine
            </h2>
            <span className="font-mono text-[10px] bg-white/5 border border-border px-2 py-1">
              {Math.max(0, profile.kcalTarget - totals.kcal).toLocaleString()} LEFT
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <MacroBlock
              label="Protein"
              value={Math.round(totals.protein)}
              target={profile.proteinG}
              accent="primary"
            />
            <MacroBlock
              label="Carbs"
              value={Math.round(totals.carbs)}
              target={profile.carbsG}
              accent="primary40"
            />
            <MacroBlock
              label="Fats"
              value={Math.round(totals.fat)}
              target={profile.fatG}
              accent="border"
            />
          </div>
        </section>

        {/* Today's meals */}
        <section className="animate-enter">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl uppercase tracking-wide">Today's Fuel</h2>
            <Link
              to="/history"
              className="font-mono text-[10px] uppercase text-muted-foreground"
            >
              All →
            </Link>
          </div>

          {today.length === 0 ? (
            <EmptyMeals />
          ) : (
            <ul className="space-y-3">
              {today.map((m) => (
                <li
                  key={m.id}
                  className="bg-surface/50 border border-border p-4 flex items-center gap-4"
                >
                  <VerdictDot verdict={m.verdict} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm uppercase truncate">{m.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • P{Math.round(m.protein)} C{Math.round(m.carbs)} F{Math.round(m.fat)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-primary leading-none">{m.kcal}</p>
                    <p className="font-mono text-[9px] uppercase text-muted-foreground">kcal</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Suggestions */}
        <SuggestionsSection goal={GOAL_LABEL[profile.goal]} />
      </main>
    </div>
  );
}

function MacroBlock({
  label,
  value,
  target,
  accent,
}: {
  label: string;
  value: number;
  target: number;
  accent: "primary" | "primary40" | "border";
}) {
  const pct = Math.min(100, (value / target) * 100);
  const borderClass =
    accent === "primary"
      ? "border-primary"
      : accent === "primary40"
        ? "border-primary/40"
        : "border-border";

  return (
    <div className={`bg-surface p-4 border-l-2 ${borderClass}`}>
      <p className="font-mono text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="text-xl font-bold leading-tight">
        {value}
        <span className="text-xs text-muted-foreground">g</span>
      </p>
      <p className="font-mono text-[9px] text-muted-foreground mt-0.5">/ {target}g</p>
      <div className="h-0.5 w-full bg-white/10 mt-2 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VerdictDot({ verdict }: { verdict: "great" | "ok" | "avoid" }) {
  const cls =
    verdict === "great"
      ? "bg-primary"
      : verdict === "avoid"
        ? "bg-destructive"
        : "bg-warning";
  return <div className={`size-2 rounded-full ${cls}`} aria-label={verdict} />;
}

function EmptyMeals() {
  return (
    <div className="border border-dashed border-border p-8 text-center">
      <p className="font-mono text-xs uppercase text-muted-foreground mb-4">
        No meals logged yet
      </p>
      <Link
        to="/scan"
        className="inline-block bg-primary text-primary-foreground px-6 py-3 font-display text-lg uppercase italic shadow-block active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
      >
        Scan first meal →
      </Link>
    </div>
  );
}

function SuggestionsSection({ goal }: { goal: string }) {
  const fetchSug = useServerFn(getSuggestions);
  const [data, setData] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cacheKey = `fuelscan-suggestions-${goal}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { ts, payload } = JSON.parse(cached);
        if (Date.now() - ts < 24 * 3600_000) {
          setData(payload);
          return;
        }
      } catch {}
    }
    setLoading(true);
    fetchSug({ data: { goal } })
      .then((res) => {
        setData(res);
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: res }));
      })
      .catch((e) => console.error("suggestions failed", e))
      .finally(() => setLoading(false));
  }, [goal, fetchSug]);

  return (
    <section className="animate-enter">
      <h2 className="font-display text-xl uppercase mb-6 tracking-wide">Targeted Fuel</h2>
      {loading && !data && (
        <div className="font-mono text-xs text-muted-foreground">Loading personalized list…</div>
      )}
      {data && (
        <div className="space-y-4">
          {data.eat.slice(0, 3).map((s, i) => (
            <SugRow key={`eat-${i}`} kind="eat" name={s.name} reason={s.reason} />
          ))}
          {data.avoid.slice(0, 3).map((s, i) => (
            <SugRow key={`avoid-${i}`} kind="avoid" name={s.name} reason={s.reason} />
          ))}
        </div>
      )}
    </section>
  );
}

function SugRow({
  kind,
  name,
  reason,
}: {
  kind: "eat" | "avoid";
  name: string;
  reason: string;
}) {
  return (
    <div
      className={`flex gap-4 p-4 bg-surface/50 border border-border ${
        kind === "avoid" ? "opacity-70" : ""
      }`}
    >
      <div
        className={`size-12 flex-shrink-0 flex items-center justify-center font-mono text-[9px] font-bold uppercase ${
          kind === "eat"
            ? "bg-primary text-primary-foreground"
            : "bg-destructive text-destructive-foreground"
        }`}
      >
        {kind === "eat" ? "Eat" : "Skip"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm uppercase truncate">{name}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">{reason}</p>
      </div>
    </div>
  );
}
