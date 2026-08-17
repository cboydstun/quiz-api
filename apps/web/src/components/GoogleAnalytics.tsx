// src/components/GoogleAnalytics.tsx

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// The `window.gtag` declaration lives with the event helper.
import "@/lib/analytics";

export default function GoogleAnalytics() {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pathname = usePathname();

  // The first page_view comes from the `config` call in layout.tsx, which runs
  // as soon as gtag.js is parsed. Firing again here would double-count the
  // landing hit, so this only reports client-side navigations. A boolean
  // rather than the initial pathname: navigating back to where you started is
  // still a navigation and has to be reported.
  const reportedInitialViewRef = useRef(false);

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    if (!reportedInitialViewRef.current) {
      reportedInitialViewRef.current = true;
      return;
    }

    window.gtag?.("config", GA_MEASUREMENT_ID, {
      page_path: pathname + window.location.search,
    });
  }, [GA_MEASUREMENT_ID, pathname]);

  return null;
}
