// src/app/layout.tsx

import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
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

export const metadata = {
  title: "Part 107 Drone License Quiz App",
  description:
    "Prepare for your FAA certification with our comprehensive quiz app",
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
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
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
          <Footer />
        </ApolloWrapper>
      </body>
    </html>
  );
}
