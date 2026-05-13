import { Link, useLocation, useNavigate } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Dash" },
  { to: "/history", label: "History" },
  { to: "/coach", label: "Coach" },
  { to: "/profile", label: "Profile" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onScan = pathname.startsWith("/scan") || pathname.startsWith("/onboarding");

  if (onScan) return null;

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-background border-t border-border px-4 py-3 flex justify-around items-center">
        {NAV.slice(0, 2).map((n) => (
          <NavBtn key={n.to} {...n} active={pathname === n.to} />
        ))}
        <div className="w-16" aria-hidden />
        {NAV.slice(2).map((n) => (
          <NavBtn key={n.to} {...n} active={pathname === n.to} />
        ))}
      </nav>
      <button
        onClick={() => navigate({ to: "/scan" })}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 size-16 bg-primary text-primary-foreground rounded-full shadow-block-lg flex flex-col items-center justify-center active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
        aria-label="Scan food"
      >
        <ScanIcon className="size-6" />
        <span className="font-mono text-[8px] uppercase font-bold mt-0.5">Scan</span>
      </button>
    </>
  );
}

function NavBtn({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`font-mono text-[10px] uppercase font-bold px-3 py-2 ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      className={className}
    >
      <path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" />
      <path d="M7 12h10" />
    </svg>
  );
}
