import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Saira } from "next/font/google";
import "./globals.css";

// Saira (variable width axis) for numbers and display: reads like an instrument cluster.
const saira = Saira({ variable: "--font-saira", subsets: ["latin"], axes: ["wdth"], display: "swap" });
// Hanken Grotesk for UI text: quiet, legible at small sizes.
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Next Move Copilot",
  description: "Turns how you drive into your smartest next financial move. Concept prototype with synthetic data.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07090d" },
    { media: "(prefers-color-scheme: light)", color: "#eceff3" },
  ],
};

// Applies a saved theme before first paint (no flash). See Next docs: preventing-flash-before-hydration.
const themeScript = `(function(){try{var t=localStorage.getItem("nm-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${saira.variable} ${hanken.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
