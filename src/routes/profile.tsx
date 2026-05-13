import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GOAL_LABEL, useApp } from "../store/app";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const profile = useApp((s) => s.profile);
  const clearAll = useApp((s) => s.clearAll);
  const navigate = useNavigate();

  if (!profile) return null;

  const reset = () => {
    if (confirm("Reset profile and clear all logged meals?")) {
      clearAll();
      localStorage.removeItem(`fuelscan-suggestions-${profile.goal}`);
      navigate({ to: "/onboarding" });
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 py-4 border-b border-border">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          Athlete profile
        </p>
        <h1 className="font-display text-3xl uppercase tracking-tight italic leading-none">
          Your Specs
        </h1>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 space-y-6">
        <div className="bg-surface p-6 border-l-2 border-primary">
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Current goal</p>
          <p className="font-display text-3xl uppercase italic text-primary mt-1">
            {GOAL_LABEL[profile.goal]}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Sex" value={profile.sex} />
          <Stat label="Age" value={`${profile.age}`} />
          <Stat label="Height" value={`${profile.heightCm} cm`} />
          <Stat label="Weight" value={`${profile.weightKg} kg`} />
          <Stat label="Activity" value={profile.activity.replace("_", " ")} />
          <Stat label="kcal target" value={profile.kcalTarget.toLocaleString()} />
        </div>

        <div className="bg-surface p-4 grid grid-cols-3 gap-4">
          <SmallStat label="Protein" value={`${profile.proteinG}g`} />
          <SmallStat label="Carbs" value={`${profile.carbsG}g`} />
          <SmallStat label="Fat" value={`${profile.fatG}g`} />
        </div>

        <button
          onClick={() => navigate({ to: "/onboarding" })}
          className="w-full bg-primary text-primary-foreground py-3 font-display text-xl uppercase italic shadow-block active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        >
          Edit profile
        </button>

        <button
          onClick={reset}
          className="w-full border border-destructive/40 text-destructive py-3 font-bold text-sm uppercase"
        >
          Reset all data
        </button>

        <p className="text-xs text-muted-foreground text-center pt-4">
          All data is stored locally in your browser. Clear site data to wipe everything.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface/50 border border-border p-4">
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-bold text-base uppercase mt-1">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-primary mt-1">{value}</p>
    </div>
  );
}
