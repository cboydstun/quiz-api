import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// next/navigation has no router context outside the App Router runtime.
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * jsdom does not implement matchMedia at all, so anything that reads it throws
 * rather than degrading. Defaults to "no preference"; a test that cares calls
 * `setReducedMotion(true)`.
 */
let reducedMotion = false;

export function setReducedMotion(value: boolean): void {
  reducedMotion = value;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("prefers-reduced-motion: reduce") && reducedMotion,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  reducedMotion = false;
  Object.values(routerMock).forEach((fn) => fn.mockClear());
});
