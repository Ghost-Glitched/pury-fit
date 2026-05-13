import { createFileRoute } from "@tanstack/react-router";
import { useApp, type Meal } from "../store/app";

export const Route = createFileRoute("/history")({
  component: History,
});

function groupByDay(meals: Meal[]) {
  const map = new Map<string, Meal[]>();
  meals.forEach((m) => {
    const d = new Date(m.timestamp);
    const key = d.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  });
  return Array.from(map.entries());
}

function History() {
  const meals = useApp((s) => s.meals);
  const removeMeal = useApp((s) => s.removeMeal);
  const groups = groupByDay(meals);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 py-4 border-b border-border">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
          Logbook
        </p>
        <h1 className="font-display text-3xl uppercase tracking-tight italic leading-none">
          Meal History
        </h1>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 space-y-10">
        {groups.length === 0 && (
          <div className="text-center py-16">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              No meals scanned yet
            </p>
          </div>
        )}
        {groups.map(([day, items]) => {
          const total = items.reduce((s, m) => s + m.kcal, 0);
          return (
            <section key={day}>
              <div className="flex justify-between items-end mb-4">
                <h2 className="font-display text-xl uppercase tracking-tight">{day}</h2>
                <span className="font-mono text-xs text-primary">{total} kcal</span>
              </div>
              <ul className="space-y-3">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="bg-surface/50 border border-border p-4 flex items-start gap-4"
                  >
                    <div
                      className={`w-1 self-stretch ${
                        m.verdict === "great"
                          ? "bg-primary"
                          : m.verdict === "avoid"
                            ? "bg-destructive"
                            : "bg-warning"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm uppercase">{m.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • {m.kcal} kcal • P{Math.round(m.protein)} C{Math.round(m.carbs)} F
                        {Math.round(m.fat)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 leading-snug">
                        {m.reasoning}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMeal(m.id)}
                      className="font-mono text-[10px] uppercase text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </div>
  );
}
