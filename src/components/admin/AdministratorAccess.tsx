import { useState, type ReactNode } from "react";
import { LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

/** Public, in-memory demo gate only; it does not protect browser-local data. */
export function AdministratorAccess({ children }: { children: ReactNode }) {
  const { demoSession, setDemoSession } = useStore();
  const [loginUnavailable, setLoginUnavailable] = useState(false);

  if (demoSession?.role === "admin") return children;

  return <section aria-labelledby="administrator-login" className="mx-auto max-w-sm space-y-6 py-4">
    <div className="space-y-2">
      <Shield className="size-8 text-primary" aria-hidden />
      <h1 id="administrator-login" className="font-display text-2xl font-bold">Administrator Login</h1>
      <p className="text-sm text-muted-foreground">CamNexus Administrator</p>
    </div>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      event.currentTarget.reset();
      setLoginUnavailable(true);
    }}>
      <div className="space-y-2"><Label htmlFor="administrator-email">Email</Label><Input id="administrator-email" type="email" autoComplete="username" required /></div>
      <div className="space-y-2"><Label htmlFor="administrator-password">Password</Label><Input id="administrator-password" type="password" autoComplete="current-password" required /></div>
      <Button type="submit" className="w-full"><LogIn aria-hidden />Login</Button>
      {loginUnavailable && <p role="status" className="text-sm text-muted-foreground">Real administrator login is unavailable in this demo-only prototype. Use Demo Login to continue.</p>}
    </form>
    <div className="space-y-3 border-t pt-4">
      <Button size="sm" variant="outline" onClick={() => setDemoSession({ role: "admin" })}>Use Demo Login</Button>
      <p className="text-xs text-muted-foreground">Public demo access only, not secure authentication. Real administrator login is unavailable. This screen does not securely protect browser-local records.</p>
    </div>
  </section>;
}