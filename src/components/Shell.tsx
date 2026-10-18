import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/camnexus-logo.png.asset.json";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Community Needs" },
  { to: "/about", label: "About Us" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
          <Link to="/" className="flex items-center">
            <img
              src={logoAsset.url}
              alt="CamNexus"
              className="h-8 w-auto max-w-[150px] object-contain md:h-9 md:max-w-[160px]"
            />
          </Link>
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Built for the PS43 Foundation hackathon challenge · Final decisions rest with PS43 staff and local partners.
        <p className="mt-2">CamNexus is a prototype using illustrative data. No real donations are processed.</p>

        <div className="mt-2"><Link to="/assessment-management" className="text-primary underline">CamNexus Administrator</Link></div>
      </footer>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}
