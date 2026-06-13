import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp, type Verdict } from "../store/app";
import type { FoodAnalysis, Alternative } from "../lib/scan.functions";

export const Route = createFileRoute("/scan/result")({
  component: ScanResult,
});

interface Pending {
  analysis: FoodAnalysis;
  source: "photo" | "barcode";
  imageDataUrl?: string;
}

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; bg: string; text: string; rotate: string }
> = {
  great: { label: "Build Fast", bg: "bg-primary", text: "text-primary-foreground", rotate: "-rotate-3" },
  ok: { label: "Eat in Moderation", bg: "bg-warning", text: "text-warning-foreground", rotate: "rotate-1" },
  avoid: { label: "Skip It", bg: "bg-destructive", text: "text-destructive-foreground", rotate: "rotate-2" },
};

const CONF_COLOR: Record<string, string> = {
  high: "bg-primary text-primary-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-destructive text-destructive-foreground",
};

const SERVING_PRESETS = [0.5, 1, 1.5, 2];

function ScanResult() {
  const navigate = useNavigate();
  const addMeal = useApp((s) => s.addMeal);

  const [pending, setPending] = useState<Pending | null>(null);

  // editable / adjustable state
  const [name, setName] = useState("");
  const [base, setBase] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [servingDescription, setServingDescription] = useState("");
  const [servings, setServings] = useState(1);
  const [editingMacros, setEditingMacros] = useState(false);
  const [showAlts, setShowAlts] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("fuelscan-pending");
    if (!raw) {
      navigate({ to: "/" });
      return;
    }
    const p = JSON.parse(raw) as Pending;
    setPending(p);
    applyBase(p.analysis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyBase(a: FoodAnalysis | Alternative) {
    setName(a.name);
    setBase({ kcal: a.kcal, protein: a.protein, carbs: a.carbs, fat: a.fat });
    setServingDescription(a.servingDescription);
  }

  const totals = useMemo(
    () => ({
      kcal: Math.round(base.kcal * servings),
      protein: Math.round(base.protein * servings),
      carbs: Math.round(base.carbs * servings),
      fat: Math.round(base.fat * servings),
    }),
    [base, servings],
  );

  if (!pending) return null;
  const a = pending.analysis;
  const cfg = VERDICT_CONFIG[a.verdict];

  const log = () => {
    addMeal({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name,
      kcal: totals.kcal,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      servings,
      servingDescription,
      verdict: a.verdict,
      reasoning: a.reasoning,
      confidence: a.confidence,
      imageDataUrl: pending.imageDataUrl,
      source: pending.source,
    });
    sessionStorage.removeItem("fuelscan-pending");
    navigate({ to: "/" });
  };

  const discard = () => {
    sessionStorage.removeItem("fuelscan-pending");
    navigate({ to: "/scan" });
  };

  return (
    <div className="min-h-screen pb-40">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <Link to="/scan" className="font-mono text-xs uppercase text-muted-foreground">
          ← Retake
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Analysis</div>
        <div className="w-12" />
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 space-y-6">
        {/* Hero */}
        <div className="relative aspect-[4/5] bg-surface overflow-hidden animate-enter">
          {pending.imageDataUrl ? (
            <img src={pending.imageDataUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display text-6xl text-muted-foreground italic">
              {name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-3 right-3">
            <span
              className={`${CONF_COLOR[a.confidence]} font-mono text-[10px] uppercase tracking-widest px-2 py-1`}
            >
              {a.confidence} confidence
            </span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className={`${cfg.bg} ${cfg.text} ${cfg.rotate} font-display text-4xl sm:text-5xl px-6 py-2 shadow-block-lg uppercase whitespace-nowrap`}
            >
              {cfg.label}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent font-display text-2xl uppercase tracking-tight text-white border-b border-white/20 focus:border-primary outline-none pb-1"
            />
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/60 mt-2">
              Source: {pending.source} · tap name to edit
            </p>
          </div>
        </div>

        {/* Wrong dish? */}
        {a.alternatives?.length > 0 && (
          <div className="bg-surface/50 border border-border p-4">
            <button
              onClick={() => setShowAlts((v) => !v)}
              className="w-full flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <span>Not this dish? Pick the right one</span>
              <span className="text-primary">{showAlts ? "▾" : "▸"}</span>
            </button>
            {showAlts && (
              <div className="mt-3 space-y-2">
                {a.alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      applyBase(alt);
                      setServings(1);
                      setShowAlts(false);
                    }}
                    className="w-full text-left p-3 bg-background border border-border hover:border-primary transition-colors"
                  >
                    <p className="font-bold text-sm">{alt.name}</p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1">
                      {alt.servingDescription} · {alt.kcal} kcal
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portion control — the big accuracy upgrade */}
        <div className="bg-surface p-5 animate-enter">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
              How much are you eating?
            </span>
            <span className="font-display text-3xl text-primary">×{servings.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            1 serving = <span className="text-foreground">{servingDescription}</span>
          </p>

          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={servings}
            onChange={(e) => setServings(parseFloat(e.target.value))}
            className="w-full mt-4 accent-primary"
          />

          <div className="grid grid-cols-4 gap-2 mt-3">
            {SERVING_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setServings(s)}
                className={`py-2 font-mono text-[10px] uppercase border ${
                  servings === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {s === 0.5 ? "½" : s === 1.5 ? "1½" : s} {s === 1 ? "serving" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-surface p-6 animate-enter">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
                You will consume
              </span>
              <button
                onClick={() => setEditingMacros((v) => !v)}
                className="block mt-1 font-mono text-[10px] uppercase text-primary"
              >
                {editingMacros ? "Done" : "Edit manually"}
              </button>
            </div>
            <div className="text-right">
              <p className="font-display text-5xl text-primary leading-none">{totals.kcal}</p>
              <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1">kcal</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <MacroStat
              label="Protein"
              value={totals.protein}
              editing={editingMacros}
              onChange={(v) => setBase((b) => ({ ...b, protein: v / servings }))}
            />
            <MacroStat
              label="Carbs"
              value={totals.carbs}
              editing={editingMacros}
              onChange={(v) => setBase((b) => ({ ...b, carbs: v / servings }))}
            />
            <MacroStat
              label="Fat"
              value={totals.fat}
              editing={editingMacros}
              onChange={(v) => setBase((b) => ({ ...b, fat: v / servings }))}
            />
          </div>

          {editingMacros && (
            <div className="mt-4 pt-4 border-t border-border">
              <label className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
                Calories per serving
              </label>
              <input
                type="number"
                value={Math.round(base.kcal)}
                onChange={(e) =>
                  setBase((b) => ({ ...b, kcal: parseFloat(e.target.value) || 0 }))
                }
                className="w-full mt-1 bg-background border border-border px-3 py-2 font-mono"
              />
            </div>
          )}
        </div>

        {/* Components */}
        {a.components?.length > 0 && (
          <div className="bg-surface/50 p-5">
            <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest mb-2">
              Detected on plate
            </p>
            <div className="flex flex-wrap gap-2">
              {a.components.map((c, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-background border border-border">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assumptions */}
        {a.assumptions && (
          <div className="bg-surface/50 border-l-2 border-warning p-5">
            <p className="font-mono text-[10px] uppercase text-warning tracking-widest mb-2">
              AI assumptions
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{a.assumptions}</p>
          </div>
        )}

        {/* Coach */}
        <div className="bg-surface/50 border-l-2 border-primary p-5 animate-enter">
          <p className="font-mono text-[10px] uppercase text-primary tracking-widest mb-2">
            Coach says
          </p>
          <p className="text-sm leading-relaxed">{a.reasoning}</p>
        </div>
      </main>

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
          Log {totals.kcal} kcal →
        </button>
      </footer>
    </div>
  );
}

function MacroStat({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: number;
  editing: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      {editing ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full mt-1 bg-background border border-border px-2 py-1 text-lg font-bold"
        />
      ) : (
        <p className="text-2xl font-bold mt-1">
          {value}
          <span className="text-sm text-muted-foreground">g</span>
        </p>
      )}
    </div>
  );
}
