import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GOAL_LABEL, useApp } from "../store/app";
import { getSuggestions, type Suggestions } from "../lib/scan.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/coach")({
  component: Coach,
});

function Coach() {
  const profile = useApp((s) => s.profile);
  const fetchSug = useServerFn(getSuggestions);
  const [data, setData] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const cacheKey = `fuelscan-suggestions-${profile.goal}`;
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
    fetchSug({ data: { goal: profile.goal } })
      .then((res) => {
        setData(res);
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), payload: res }));
      })
      .finally(() => setLoading(false));
  }, [profile, fetchSug]);

  const refresh = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetchSug({ data: { goal: profile.goal } });
      setData(res);
      localStorage.setItem(
        `fuelscan-suggestions-${profile.goal}`,
        JSON.stringify({ ts: Date.now(), payload: res }),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 py-4 border-b border-border flex justify-between items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">
            AI Coach for {GOAL_LABEL[profile.goal]}
          </p>
          <h1 className="font-display text-3xl uppercase tracking-tight italic leading-none">
            Targeted Fuel
          </h1>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="font-mono text-[10px] uppercase border border-border px-3 py-2 disabled:opacity-50"
        >
          {loading ? "…" : "Refresh"}
        </button>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 space-y-10">
        {!data && loading && (
          <p className="font-mono text-xs text-muted-foreground">Generating your list…</p>
        )}
        {data && (
          <>
            <section>
              <h2 className="font-display text-xl uppercase mb-4 text-primary">Eat More</h2>
              <ul className="space-y-3">
                {data.eat.map((s, i) => (
                  <li key={i} className="bg-surface/50 border-l-2 border-primary p-4">
                    <p className="font-bold text-sm uppercase">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl uppercase mb-4 text-destructive">
                Avoid for Now
              </h2>
              <ul className="space-y-3">
                {data.avoid.map((s, i) => (
                  <li
                    key={i}
                    className="bg-surface/50 border-l-2 border-destructive p-4 opacity-80"
                  >
                    <p className="font-bold text-sm uppercase">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
