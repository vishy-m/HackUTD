"use client";

import { Eye, EyeOff, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { findOption } from "@/lib/client/data-store";
import { moveLabel, shortDate } from "@/lib/client/format";
import { useOverlayStore } from "@/lib/client/overlay-store";
import { useUiStore } from "@/lib/client/ui-store";
import { leaseFacts } from "@/lib/client/lease";
import type { DashboardData, Hotspot, MoveOption } from "@/lib/types";
import { AskButton } from "./AskButton";
import { HeroCarSlot } from "./HeroCarSlot";

function hotspotLabels(d: DashboardData): Partial<Record<Hotspot, string>> {
  const v = d.persona.vehicle;
  const lease = leaseFacts(d);
  const out: Partial<Record<Hotspot, string>> = {
    odometer: lease
      ? `${v.odometer.toLocaleString()} mi · ${lease.overMiles > 0 ? `${Math.round(lease.overMiles).toLocaleString()} over at lease end` : `${Math.round(lease.limitOdo - lease.projectedOdo).toLocaleString()} to spare`}`
      : `${v.odometer.toLocaleString()} mi`,
    "driver-seat": d.persona.consent.driving ? `Driving score ${Math.round(d.driving.score)}/100` : "Driving data off",
  };
  const prot = d.engines.protection?.options.find((o) => o.id !== d.engines.protection.baselineOptionId && o.eligible);
  if (prot?.monthlyCost) out.engine = `${prot.title} · $${Math.round(prot.monthlyCost)}/mo`;
  const trail = d.driving.categoryMiles?.trailhead ?? 0;
  out.tires = trail > 0 ? `${Math.round(trail).toLocaleString()} trail miles in 90 days` : `${d.trips.reduce((a, t) => a + t.hardBrakes, 0)} hard brakes in 90 days`;
  return out;
}

function impactOf(o: MoveOption) {
  if (o.upgradeModel && o.monthlyCost) return { value: o.monthlyCost, suffix: "/mo", caption: "new lease, with miles to spare on this one" };
  const s = o.savingsVsBaseline ?? 0;
  if (o.moveType === "insurance" && s > 0) return { value: s, suffix: "/yr", caption: "saved vs your current premium" };
  if (s > 0) return { value: s, suffix: "", caption: o.moveType === "lease-end" ? "saved vs returning the car" : "saved over the loan" };
  if (o.monthlyCost) return { value: o.monthlyCost, suffix: "/mo", caption: "estimated cost" };
  return null;
}

export function HeroStage({ data }: { data?: DashboardData }) {
  const setOpenMove = useUiStore((s) => s.setOpenMove);
  const openWhy = useOverlayStore((s) => s.openWhy);
  const [preview, setPreview] = useState(false);

  if (!data) {
    return (
      <section aria-busy className="glass grid min-h-[420px] grid-cols-1 gap-6 overflow-hidden rounded-xl p-6 xl:grid-cols-[1.3fr_1fr]">
        <Skeleton className="h-[260px] w-full rounded-3xl xl:h-full" />
        <div className="space-y-4 py-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-16 w-1/2" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </section>
    );
  }

  const v = data.persona.vehicle;
  const top = data.ranked[0];
  const opt = top ? findOption(data, top.optionId) : undefined;
  const impact = opt ? impactOf(opt) : null;
  const upgrade = opt?.upgradeModel;
  const accepted = opt ? data.preferences.accepted.some((a) => a.optionId === opt.id) : false;

  return (
    <section aria-labelledby="next-move-title" className="glass relative overflow-hidden rounded-xl">
      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr]">
        {/* Stage */}
        <div className="flex min-w-0 flex-col">
          <div className="relative h-[300px] sm:h-[380px] xl:h-auto xl:min-h-[440px] xl:flex-1">
            <HeroCarSlot vehicle={v} upgradePreview={preview ? upgrade : undefined} hotspotLabels={hotspotLabels(data)} className="absolute inset-0 [&_.nm-hero]:rounded-none" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <div className="flex items-center gap-2">
                <dt className="sr-only">Paint</dt>
                <dd className="size-3 rounded-full ring-1 ring-line-2" style={{ background: v.paintHex }} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-ink-3">Odometer</dt>
                <dd className="num font-semibold text-ink">
                  <AnimatedNumber value={v.odometer} /> mi
                </dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-ink-3">{v.isHybrid ? "Hybrid" : "Fuel"}</dt>
                <dd className="num font-semibold text-ink">{v.mpg} mpg</dd>
              </div>
            </dl>
            {upgrade && (
              <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
                {preview ? <EyeOff size={14} /> : <Eye size={14} />}
                {preview ? "Hide preview" : `Preview ${upgrade.name.replace(/^\d{4} /, "").split(" ").slice(0, 2).join(" ")}`}
              </Button>
            )}
          </div>
        </div>

        {/* The answer */}
        <div className="relative flex flex-col justify-center gap-5 border-t border-line p-6 sm:p-7 xl:border-t-0 xl:border-l">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-accent-ink">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Recommended next move
            </span>
            <AskButton widget="next-move" optionId={opt?.id} label="Ask about this move" />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {opt ? (
              <motion.div
                key={opt.id + data.persona.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="space-y-5"
              >
                <h1 id="next-move-title" className="font-display text-[clamp(26px,2.3vw,34px)] leading-[1.12] text-balance text-ink">
                  {opt.title}
                </h1>
                {impact && (
                  <div>
                    <div className="num flex items-baseline text-[clamp(38px,3.4vw,52px)] leading-none font-semibold text-ink">
                      <span className="mr-0.5 text-[0.55em] text-ink-2">$</span>
                      <AnimatedNumber value={impact.value} />
                      {impact.suffix && <span className="ml-1 text-[0.4em] font-medium text-ink-2">{impact.suffix}</span>}
                    </div>
                    <p className="mt-2 text-sm text-ink-3">{impact.caption}</p>
                  </div>
                )}
                <p className="line-clamp-3 max-w-[48ch] text-[15px] leading-relaxed text-ink-2">{opt.summary}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="neutral">{moveLabel[opt.moveType]}</Chip>
                  {opt.deadline && <Chip tone="warn">Decide by {shortDate(opt.deadline)}</Chip>}
                  {accepted && <Chip tone="good">Accepted</Chip>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="primary" size="md" className="h-11" onClick={() => setOpenMove(opt.moveType)}>
                    Compare options
                  </Button>
                  <Button variant="outline" size="md" className="h-11" onClick={() => openWhy(opt.id)}>
                    <Info size={16} />
                    Why this?
                  </Button>
                </div>
              </motion.div>
            ) : (
              <p className="text-ink-2">Nothing urgent. Your lease, loan, insurance and protection all look on track.</p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

