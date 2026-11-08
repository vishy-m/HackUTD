"use client";

import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { ContractCard } from "@/components/dashboard/ContractCard";
import { DrivingLife } from "@/components/dashboard/DrivingLife";
import { MoneyCard } from "@/components/dashboard/MoneyCard";
import { bestOption, moveIcon } from "@/components/dashboard/MoveTiles";
import { RepairAdvisor } from "@/components/repair/RepairAdvisor";
import { DragSurface } from "@/components/stage/Interact";
import { usePageShot, useScrollShot } from "@/components/stage/hooks";
import { moveLabel } from "@/lib/client/format";
import { leaseFacts } from "@/lib/client/lease";
import { useDashboard } from "@/lib/client/use-dashboard";
import { useUiStore } from "@/lib/client/ui-store";
import type { DashboardData, MoveOption, MoveType } from "@/lib/types";
import { PageBody, PageStage, type Stat } from "./PageStage";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const ORDER: MoveType[] = ["lease-end", "insurance", "payment", "protection"];

// ---------------------------------------------------------------- Moves

function headline(o: MoveOption): { text: string; tone: "good" | "ink" } | null {
  const s = o.savingsVsBaseline ?? 0;
  if (o.upgradeModel && o.monthlyCost) return { text: `${money(o.monthlyCost)}/mo`, tone: "ink" };
  if (s > 0) return { text: `${money(s)}${o.moveType === "insurance" ? "/yr" : ""} saved`, tone: "good" };
  if (o.monthlyCost) return { text: `${money(o.monthlyCost)}/mo`, tone: "ink" };
  return null;
}

function moveCallout(m: MoveType, d: DashboardData, o?: MoveOption) {
  switch (m) {
    case "lease-end":
      return `${d.persona.vehicle.odometer.toLocaleString("en-US")} mi today`;
    case "insurance":
      return d.persona.consent.driving ? `Driving score ${Math.round(d.driving.score)}` : "Driving data off";
    case "protection":
      return o?.monthlyCost ? `${o.title} · $${Math.round(o.monthlyCost)}/mo` : "Engine and service";
    case "payment":
      return "";
  }
}

export function MovesView() {
  const { data } = useDashboard();
  const setOpenMove = useUiStore((s) => s.setOpenMove);
  const [focus, setFocus] = useState<MoveType | null>(null);
  const focusOpt = data && focus ? bestOption(data, data.engines[focus]) : undefined;
  usePageShot(focus ? `move-${focus}` : "moves", data && focus ? moveCallout(focus, data, focusOpt) : "");

  if (!data) return <div className="h-[calc(100dvh-var(--hdr))]" aria-busy />;
  const topType = data.ranked[0]?.moveType;

  return (
    <section className="relative mx-auto flex min-h-[calc(100dvh-var(--hdr))] w-full max-w-[1440px] flex-col justify-end px-5 pb-10 sm:px-10 lg:justify-center lg:pb-14">
      <DragSurface className="absolute inset-x-0 top-0 h-[34%] lg:inset-y-0 lg:right-0 lg:left-[50%] lg:h-auto" />
      <div className="relative max-w-[600px]">
        <h1 className="font-display text-[clamp(40px,5vw,76px)] leading-[0.98] tracking-[-0.035em] text-ink">Your moves</h1>
        <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">Four decisions about your car, ranked for you. Point at one to see where it lives on the car; open it to compare every option.</p>
        <ul className="mt-8 divide-y divide-line border-y border-line" onMouseLeave={() => setFocus(null)}>
          {ORDER.map((m) => {
            const e = data.engines[m];
            const o = bestOption(data, e);
            const Icon = moveIcon[m];
            const h = o && o.eligible ? headline(o) : null;
            const rank = data.ranked.findIndex((r) => r.moveType === m);
            const isTop = m === topType;
            const na = !o || e.options.every((x) => !x.eligible);
            return (
              <li key={m}>
                <button
                  type="button"
                  onMouseEnter={() => setFocus(m)}
                  onFocus={() => setFocus(m)}
                  onBlur={() => setFocus(null)}
                  onClick={() => setOpenMove(m)}
                  className={clsx(
                    "group grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left transition-colors",
                    focus === m ? "text-ink" : "text-ink-2",
                    na && "opacity-60",
                  )}
                >
                  <span className={clsx("grid size-9 place-items-center rounded-lg border transition-colors", isTop ? "border-accent text-accent-ink" : "border-line-2 text-ink-2", focus === m && !isTop && "border-ink text-ink")}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[13px] text-ink-3">
                      {moveLabel[m]}
                      {isTop ? <span className="font-medium text-accent-ink">Recommended</span> : rank > 0 ? <span>Rank {rank + 1}</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[19px] font-medium text-ink">{na ? (o?.ineligibleReason ?? "Not available") : o?.title}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {h && <span className={clsx("num text-[19px] font-semibold", h.tone === "good" ? "text-good" : "text-ink")}>{h.text}</span>}
                    <ArrowRight size={18} className="text-ink-3 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Finances

export function FinancesView() {
  const { data } = useDashboard();
  const ref = useRef<HTMLDivElement>(null);
  usePageShot("finances");
  useScrollShot(ref, "finances", "financesLow", { offset: ["start start", "end end"] });
  const stats: Stat[] = [];
  if (data) {
    const c = data.persona.contract;
    stats.push({ label: "Monthly payment", value: money(c.monthlyPayment) });
    stats.push({ label: c.kind === "lease" ? "Lease left" : "Payments left", value: `${c.monthsRemaining} mo`, tone: c.kind === "lease" && c.monthsRemaining <= 6 ? "warn" : "ink" });
    if (c.kind === "loan") stats.push({ label: "Still owed", value: money(c.principalRemaining) });
    else {
      const l = leaseFacts(data);
      stats.push({ label: "Miles at lease end", value: l ? (l.overMiles > 0 ? `${Math.round(l.overMiles).toLocaleString()} over` : `${Math.round(l.limitOdo - l.projectedOdo).toLocaleString()} spare`) : "—", tone: l && l.overMiles > 0 ? "warn" : "good" });
    }
  }
  return (
    <div ref={ref}>
      <PageStage title="Contract and payments" lead="Your agreement, payment record, cash flow and insurance premium in one place." stats={stats} />
      <PageBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ContractCard data={data} />
          <MoneyCard data={data} />
        </div>
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Driving

export function DrivingView() {
  const { data } = useDashboard();
  const ref = useRef<HTMLDivElement>(null);
  usePageShot("driving");
  useScrollShot(ref, "driving", "drivingLow", { offset: ["start start", "end end"] });
  const stats: Stat[] = [];
  if (data && data.persona.consent.driving) {
    const tripMiles = data.trips.reduce((a, t) => a + t.miles, 0);
    stats.push({ label: "Driving score", value: Math.round(data.driving.score) });
    stats.push({ label: "Trips, 90 days", value: data.trips.length });
    stats.push({ label: "Miles, 90 days", value: Math.round(tripMiles).toLocaleString("en-US") });
  }
  return (
    <div ref={ref}>
      <PageStage title="Driving" lead="Every trip from the last 90 days, what moves your score, and how many miles you drive each month." stats={stats} />
      <PageBody>
        <DrivingLife data={data} />
      </PageBody>
    </div>
  );
}

// ---------------------------------------------------------------- Repair

export function RepairView() {
  const { data } = useDashboard();
  usePageShot("repair", "Engine bay");
  return (
    <div className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 px-5 pt-6 pb-16 sm:px-10 lg:grid-cols-[minmax(0,720px)_1fr] lg:pt-10">
      <div className="order-2 lg:order-1">
        <RepairAdvisor key={data?.persona.id ?? "loading"} data={data} />
      </div>
      <DragSurface className="order-1 h-[34vh] lg:sticky lg:top-[calc(var(--hdr)+24px)] lg:order-2 lg:h-[calc(100dvh-var(--hdr)-48px)]" />
    </div>
  );
}
