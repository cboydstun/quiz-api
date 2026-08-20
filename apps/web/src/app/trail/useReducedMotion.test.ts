import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useReducedMotion } from "./useReducedMotion";
import { setReducedMotion } from "../../../vitest.setup";

describe("useReducedMotion", () => {
  it("reports no preference by default", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reads a reduce preference present at mount", () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("follows a preference change after mount", () => {
    // The global matchMedia mock's addEventListener is a no-op, so a real
    // subscription needs a live stand-in for this one test.
    let matches = false;
    let handler: ((e: { matches: boolean }) => void) | null = null;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        handler = fn;
      },
      removeEventListener: () => {
        handler = null;
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const { result, unmount } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);

      matches = true;
      act(() => handler?.({ matches: true }));
      expect(result.current).toBe(true);

      unmount();
      expect(handler).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });
});
