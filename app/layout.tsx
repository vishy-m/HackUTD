import type { Metadata, Viewport } from "next";
import { DM_Mono, Funnel_Display, Funnel_Sans } from "next/font/google";
import "./globals.css";

// One family: Funnel Display for headings, Funnel Sans for UI text and figures, DM Mono for codes.
const display = Funnel_Display({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const ui = Funnel_Sans({ variable: "--font-ui", subsets: ["latin"], display: "swap" });
const code = DM_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Next Move Copilot",
  description: "Your Toyota lease or loan, insurance and driving in one place, with the next decision worth making. Concept prototype with synthetic data.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0d0f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
  ],
};

// Applies a saved theme before first paint (no flash). See Next docs: preventing-flash-before-hydration.
const themeScript = `(function(){try{var t=localStorage.getItem("nm-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} ${code.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
