import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  computeTargets,
  GOAL_LABEL,
  useApp,
  type Activity,
  type Goal,
  type Sex,
} from "../store/app";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const GOALS: Goal[] = ["lose", "maintain", "gain", "muscle", "health"];
const ACTIVITIES: { id: Activity; label: string; desc: string }[] = [
  { id: "sedentary", label: "Sedentary", desc: "Little to no exercise" },
  { id: "light", label: "Light", desc: "1-3 sessions / week" },
  { id: "moderate", label: "Moderate", desc: "3-5 sessions / week" },
  { id: "active", label: "Active", desc: "6-7 sessions / week" },
  { id: "very_active", label: "Athlete", desc: "Twice daily / heavy" },
];

function Onboarding() {
  const navigate = useNavigate();
  const setProfile = useApp((s) => s.setProfile);
  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState<Goal>("muscle");
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState(28);
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(75);
  const [activity, setActivity] = useState<Activity>("moderate");

  const finish = () => {
    const t = computeTargets(sex, age, heightCm, weightKg, activity, goal);
    setProfile({ goal, sex, age, heightCm, weightKg, activity, ...t });
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <div className="font-display text-xl uppercase tracking-tight">FuelScan</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Step {step + 1} / 3
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-6 py-8">
        {step === 0 && (
          <div className="animate-enter space-y-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">
                Step 01
              </p>
              <h1 className="font-display text-4xl uppercase tracking-tight italic leading-none">
                Pick your phase
              </h1>
              <p className="text-sm text-muted-foreground mt-3">
                We'll calibrate your daily fuel and verdict logic to this goal.
              </p>
            </div>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`w-full text-left p-4 border transition-all ${
                    goal === g
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface/50 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl uppercase tracking-tight">
                      {GOAL_LABEL[g]}
                    </span>
                    {goal === g && (
                      <span className="font-mono text-[10px] uppercase text-primary">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-enter space-y-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">
                Step 02
              </p>
              <h1 className="font-display text-4xl uppercase tracking-tight italic leading-none">
                Body specs
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`p-4 border font-display text-lg uppercase tracking-tight ${
                    sex === s
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-surface/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <NumberField label="Age" suffix="years" value={age} onChange={setAge} min={14} max={99} />
            <NumberField
              label="Height"
              suffix="cm"
              value={heightCm}
              onChange={setHeightCm}
              min={120}
              max={230}
            />
            <NumberField
              label="Weight"
              suffix="kg"
              value={weightKg}
              onChange={setWeightKg}
              min={35}
              max={250}
            />
          </div>
        )}

        {step === 2 && (
          <div className="animate-enter space-y-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">
                Step 03
              </p>
              <h1 className="font-display text-4xl uppercase tracking-tight italic leading-none">
                Activity load
              </h1>
            </div>

            <div className="space-y-3">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setActivity(a.id)}
                  className={`w-full text-left p-4 border ${
                    activity === a.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface/50"
                  }`}
                >
                  <div className="font-bold text-sm uppercase">{a.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                </button>
              ))}
            </div>

            <div className="bg-surface border border-border p-4 mt-6">
              <p className="font-mono text-[10px] uppercase text-muted-foreground mb-2">
                Your daily target
              </p>
              <p className="font-display text-3xl text-primary">
                {computeTargets(sex, age, heightCm, weightKg, activity, goal).kcalTarget.toLocaleString()}
                <span className="font-sans text-sm text-muted-foreground ml-2">kcal</span>
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="px-6 py-3 border border-border font-bold text-sm uppercase"
          >
            Back
          </button>
        )}
        <button
          onClick={() => (step < 2 ? setStep((s) => s + 1) : finish())}
          className="flex-1 bg-primary text-primary-foreground py-3 font-display text-xl uppercase italic shadow-block active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        >
          {step < 2 ? "Continue →" : "Launch FuelScan"}
        </button>
      </footer>
    </div>
  );
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="border border-border bg-surface/50 p-4 flex items-center gap-4">
      <label className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest w-16">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="flex-1 bg-transparent font-display text-2xl text-primary outline-none"
      />
      <span className="font-mono text-xs text-muted-foreground">{suffix}</span>
    </div>
  );
}
