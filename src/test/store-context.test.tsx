import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoreProvider, useStore } from "@/lib/store";

describe("Store context during preview updates", () => {
  it("keeps an existing provider connected to a reloaded store consumer", async () => {
    const context = await import("@/lib/store-context");
    // A non-component context module is retained when the store's component module reloads.
    vi.doMock("@/lib/store-context", () => context);
    vi.resetModules();
    const updated = await import("@/lib/store");
    function Consumer() {
      const { schools } = updated.useStore();
      return <output data-testid="school-id">{schools[0]?.id}</output>;
    }
    render(<StoreProvider><Consumer /></StoreProvider>);
    expect(screen.getByTestId("school-id").textContent).toBe("s1");
    vi.doUnmock("@/lib/store-context");
  });
  it("still rejects use outside the provider instead of silently resetting state", () => {
    function Consumer() { useStore(); return null; }
    expect(() => render(<Consumer />)).toThrow("StoreProvider missing");
  });
});