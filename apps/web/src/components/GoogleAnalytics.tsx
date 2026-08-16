// src/components/GoogleAnalytics.tsx

"use client";

declare global {
  interface Window {
    gtag: (
      command: "config" | "event",
      id: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pathname = usePathname();

  useEffect(() => {
    // gtag.js is loaded with strategy="afterInteractive", so it may not be
    // on the page yet when this effect first runs.
    if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
      const url = pathname + window.location.search;
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  }, [GA_MEASUREMENT_ID, pathname]);

  return null;
}
