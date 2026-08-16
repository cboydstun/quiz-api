// src/app/layout.tsx

import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import GoogleAnalytics from "../components/GoogleAnalytics";
import { ApolloWrapper } from "../components/ApolloWrapper";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./styles/global.css";

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
    <html lang="en">
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
      <body className="flex flex-col min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <ApolloWrapper>
          <Navbar />
          <GoogleAnalytics />
          <main className="grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
            {children}
          </main>
          <Analytics />
          <Footer />
        </ApolloWrapper>
      </body>
    </html>
  );
}
