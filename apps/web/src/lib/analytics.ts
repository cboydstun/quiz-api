/**
 * Thin wrapper over gtag. Every call is a no-op when
 * NEXT_PUBLIC_GA_MEASUREMENT_ID is unset, because layout.tsx renders no gtag
 * scripts in that case — so this must never assume `window.gtag` exists.
 *
 * The point of these events is that the funnel is otherwise unmeasurable:
 * pageviews alone cannot tell you whether a visitor started a run, finished
 * one, or signed up afterwards.
 */

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event",
      idOrName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

export type AnalyticsEvent =
  | "quiz_start"
  | "quiz_complete"
  | "quiz_signup_prompt"
  | "trail_start"
  | "trail_end"
  | "sign_up"
  | "login";

export function trackEvent(
  name: AnalyticsEvent,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}
