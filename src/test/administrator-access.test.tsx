import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdministratorAccess } from "@/components/admin/AdministratorAccess";
import { StoreCtx, type Ctx } from "@/lib/store-context";
import type { DemoSession } from "@/lib/school-demo";

function Harness({ initial = null }: { initial?: DemoSession | null }) {
  const [demoSession, setDemoSession] = useState<DemoSession | null>(initial);
  // The access gate consumes only these two context properties.
  const context = { demoSession, setDemoSession } as Ctx;
  return <StoreCtx.Provider value={context}><AdministratorAccess><div data-testid="dashboard"><button onClick={() => setDemoSession(null)}>Logout</button></div></AdministratorAccess></StoreCtx.Provider>;
}

describe("Demo administrator access", () => {
  it("withholds the dashboard without a demo administrator session", () => {
    render(<Harness />);
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });
  it("withholds the dashboard from a school session", () => {
    render(<Harness initial={{ role: "school", schoolId: "school-1" }} />);
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });
  it("grants immediate public demo access without credentials", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Use Demo Login" }));
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });
  it("returns to the login screen when the demo session is cleared", () => {
    render(<Harness initial={{ role: "admin" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(screen.queryByTestId("dashboard")).toBeNull();
    expect(screen.getByRole("button", { name: "Use Demo Login" })).toBeInTheDocument();
  });
  it("never grants administrator access from email and password", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "judge@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "not-real-credentials" } });
    const form = screen.getByRole("button", { name: /^Login$/ }).closest("form");
    if (!form) throw new Error("Login form missing");
    fireEvent.submit(form);
    expect(screen.queryByTestId("dashboard")).toBeNull();
  });
});