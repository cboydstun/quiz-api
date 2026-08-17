// src/app/layout.tsx

import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_NAME, siteOrigin } from "../lib/site";
import { Archivo, JetBrains_Mono } from "next/font/google";
import GoogleAnalytics from "../components/GoogleAnalytics";
import { ApolloWrapper } from "../components/ApolloWrapper";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./styles/global.css";

// Both are variable fonts, so the whole 100-900 axis arrives in one file and no
// `weight` is needed. The design caps usage at 600 — nothing here should reach
// for `font-bold`.
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

/**
 * Every route inherited one title and one description, so every page looked
 * identical in a search result and a shared link unfurled as a bare domain.
 *
 * `metadataBase` is what makes the relative opengraph-image resolve to an
 * absolute URL — without it the og:image tag points at nothing a crawler can
 * fetch. `title.template` lets each route set only its own half.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Part 107 Practice Test — Free FAA Drone License Quiz",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Free Part 107 practice tests for the FAA remote pilot certificate. " +
    "Timed runs across all 12 knowledge areas, answers explained, and " +
    "per-domain accuracy tracking. No account needed to start.",
  applicationName: SITE_NAME,
  keywords: [
    "Part 107",
    "Part 107 practice test",
    "FAA drone license",
    "remote pilot certificate",
    "drone pilot exam",
    "UAS knowledge test",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Part 107 Practice Test — Free FAA Drone License Quiz",
    description:
      "Timed Part 107 practice runs across all 12 knowledge areas, with " +
      "every answer explained. No account needed to start.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Part 107 Practice Test — Free FAA Drone License Quiz",
    description:
      "Timed Part 107 practice runs, every answer explained. No account " +
      "needed to start.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${archivo.variable} ${jetbrainsMono.variable}`}>
      <head>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            {/*
              The `config` call has to be here, not in an effect. GA4 emits the
              first page_view from `config`, and gtag.js loads afterInteractive
              — so an effect that guards on `typeof window.gtag === "function"`
              finds nothing on a cold load and never retries, since the pathname
              it depends on does not change. That dropped the landing hit: the
              one that matters most for a referral. dataLayer.push queues fine
              before the library arrives, so this is safe to call immediately.
            */}
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="flex flex-col min-h-screen bg-ink-900 text-bone-100">
        <ApolloWrapper>
          <Navbar />
          <GoogleAnalytics />
          {/*
            `main` is deliberately full-bleed: the nav is a sticky 64px bar and
            the landing hero runs edge to edge on the survey grid. Each page
            supplies its own `max-w-*` container and padding.
          */}
          <main className="grow">{children}</main>
          <Analytics />
          <SpeedInsights />
          <Footer />
        </ApolloWrapper>
      </body>
    </html>
  );
}
