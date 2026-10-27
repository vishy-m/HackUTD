"use client";
// "3D model credits" footer, generated from public/models/manifest.json (only models in use).
import { activeCredits } from "./models";

export default function ModelCredits({ className }: { className?: string }) {
  const credits = activeCredits();
  return (
    <footer className={`text-[11px] leading-relaxed text-white/45 ${className ?? ""}`} aria-label="3D model credits">
      <span className="mr-1 font-medium text-white/60">3D model credits:</span>
      {credits.map((c, i) => (
        <span key={c.url}>
          <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-white/80">
            {c.title}
          </a>{" "}
          by {c.author} ({c.license}){i < credits.length - 1 ? " · " : ""}
        </span>
      ))}
      <span className="ml-1">Concept prototype; not an official Toyota product. Map data © Mapbox © OpenStreetMap.</span>
    </footer>
  );
}
