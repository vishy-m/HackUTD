"use client";

import { MoveHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { DragSurface } from "@/components/stage/Interact";

export interface Stat {
  label: string;
  value: ReactNode;
  tone?: "ink" | "good" | "warn";
}

/**
 * First screen of a dashboard page: title and the page's headline figures on the left, the car
 * framed on the right (or above, on phones). The rest of the page scrolls up over the car.
 */
export function PageStage({ title, lead, stats, children }: { title: string; lead: string; stats?: Stat[]; children?: ReactNode }) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100dvh-var(--hdr))] w-full max-w-[1440px] flex-col justify-end px-5 pb-10 sm:px-10 lg:justify-center lg:pb-16">
      <DragSurface className="absolute inset-x-0 top-0 h-[44%] lg:inset-y-0 lg:right-0 lg:left-[46%] lg:h-auto" />
      <div className="pointer-events-none relative max-w-[540px]">
        <h1 className="font-display text-[clamp(40px,5vw,76px)] leading-[0.98] tracking-[-0.035em] text-ink">{title}</h1>
        <p className="mt-4 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">{lead}</p>
        {stats && stats.length > 0 && (
          <dl className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[13px] text-ink-3">{s.label}</dt>
                <dd className={`num mt-1 text-[clamp(26px,2.4vw,36px)] leading-none font-semibold tracking-[-0.02em] ${s.tone === "good" ? "text-good" : s.tone === "warn" ? "text-warn" : "text-ink"}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {children && <div className="pointer-events-auto mt-8">{children}</div>}
      </div>
      <p className="pointer-events-none absolute right-10 bottom-6 hidden items-center gap-2 text-[13px] text-ink-3 lg:inline-flex">
        <MoveHorizontal size={14} />
        Drag the car to turn it
      </p>
    </section>
  );
}

/** Container for the cards that scroll up over the car. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="relative mx-auto w-full max-w-[1440px] space-y-6 px-5 pb-16 sm:px-10">{children}</div>;
}
