"use client";

// Overview as a scroll story. One pinned chapter per part of the car: the camera scrubs toward
// it as you scroll, a callout marks the part with its figure, and the copy lights up word by word.

import clsx from "clsx";
import { ArrowDown, ArrowRight, Eye, EyeOff, Info, MoveHorizontal } from "lucide-react";
import Link from "next/link";
import { motion, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoveTiles } from "@/components/dashboard/MoveTiles";
import { Button } from "@/components/ui/Button";
import { DragSurface, ScrubNumber, ScrubReveal, ScrubText } from "@/components/stage/Interact";
import { useScrollShot } from "@/components/stage/hooks";
import { findOption } from "@/lib/client/data-store";
import { SHOTS, useDirector, type ShotName } from "@/lib/client/director";
import { shortDate } from "@/lib/client/format";
import { leaseFacts } from "@/lib/client/lease";
import { useOverlayStore } from "@/lib/client/overlay-store";
import { useDashboard } from "@/lib/client/use-dashboard";
import { useUiStore } from "@/lib/client/ui-store";
import type { DashboardData, MoveOption } from "@/lib/types";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const miles = (n: number) => Math.round(n).toLocaleString("en-US");

function impactOf(o: MoveOption) {
  if (o.upgradeModel && o.monthlyCost) return { value: o.monthlyCost, suffix: "/mo", caption: "for a new lease, with miles to spare" };
  const s = o.savingsVsBaseline ?? 0;
  if (o.moveType === "insurance" && s > 0) return { value: s, suffix: "/yr", caption: "saved against your current premium" };
  if (s > 0) return { value: s, suffix: "", caption: o.moveType === "lease-end" ? "saved against returning the car" : "saved over the loan" };
  if (o.monthlyCost) return { value: o.monthlyCost, suffix: "/mo", caption: "estimated cost" };
  return null;
}

export function Story() {
  const { data } = useDashboard();
  if (!data) return <div className="h-[calc(100dvh-var(--hdr))]" aria-busy />;
  return (
    <div key={data.persona.id}>
      <Hero data={data} />
      <ContractChapter data={data} />
      <DrivingChapter data={data} />
      <ProtectionChapter data={data} />
      <InsuranceChapter data={data} />
      <Finale data={data} />
    </div>
  );
}

// ---------------------------------------------------------------- layout pieces

/** A pinned chapter: tall section, sticky frame, copy on the side opposite the car. */
function Chapter({
  id,
  from,
  to,
  calloutText,
  side,
  height = "h-[300vh]",
  children,
}: {
  id: string;
  from: ShotName;
  to: ShotName;
  calloutText?: string;
  side: "left" | "right";
  height?: string;
  children: (p: MotionValue<number>) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollShot(ref, from, to, { calloutText });
  return (
    <section ref={ref} id={id} aria-labelledby={`${id}-h`} className={clsx("relative", height)}>
      <div className="sticky top-[var(--hdr)] flex h-[calc(100dvh-var(--hdr))] items-end overflow-hidden lg:items-center">
        {/* Fades the car out under the copy so it always reads. */}
        <div
          aria-hidden
          className={clsx(
            "pointer-events-none absolute inset-0 hidden from-[var(--bg)] from-[34%] to-transparent to-[58%] lg:block",
            side === "right" ? "bg-gradient-to-l" : "bg-gradient-to-r",
          )}
        />
        <div className={clsx("relative mx-auto flex w-full max-w-[1440px] px-5 sm:px-10", side === "right" ? "lg:justify-end" : "lg:justify-start")}>
          <div className="story-copy w-full max-w-[460px] pb-10 lg:pb-0">{children(progress)}</div>
        </div>
      </div>
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[15px] font-medium text-accent-ink">{children}</p>;
}

function Bar({ progress, to, tone = "ink", marker }: { progress: MotionValue<number>; to: number; tone?: "ink" | "warn" | "good"; marker?: number }) {
  const reduced = useUiStore((s) => s.reducedMotion);
  const width = useTransform(progress, [0.2, 0.62], reduced ? [`${to * 100}%`, `${to * 100}%`] : ["0%", `${to * 100}%`]);
  return (
    <div className="relative mt-5 h-2 w-full rounded-full bg-line-2">
      <motion.div className={clsx("absolute inset-y-0 left-0 rounded-full", tone === "warn" ? "bg-warn" : tone === "good" ? "bg-good" : "bg-ink")} style={{ width }} />
      {marker != null && <div className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-ink" style={{ left: `${marker * 100}%` }} aria-hidden />}
    </div>
  );
}

// ---------------------------------------------------------------- hero

function Hero({ data }: { data: DashboardData }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useUiStore((s) => s.reducedMotion);
  const setOpenMove = useUiStore((s) => s.setOpenMove);
  const openWhy = useOverlayStore((s) => s.openWhy);
  const setPreview = useDirector((s) => s.setPreview);
  const [preview, setPreviewOn] = useState(false);
  const progress = useScrollShot(ref, "hero", "heroLift", { calloutText: "" });
  const y = useTransform(progress, [0, 0.7], reduced ? [0, 0] : [0, -120]);
  const opacity = useTransform(progress, [0.25, 0.7], reduced ? [1, 1] : [1, 0]);
  const cueOpacity = useTransform(progress, [0, 0.08], [1, 0]);

  const v = data.persona.vehicle;
  const c = data.persona.contract;
  const top = data.ranked[0];
  const opt = top ? findOption(data, top.optionId) : undefined;
  const impact = opt ? impactOf(opt) : null;
  const upgrade = opt?.upgradeModel;

  // First paint of the overview: start on the hero shot.
  useEffect(() => {
    useDirector.getState().setPose(SHOTS.hero, "");
    return () => {
      useDirector.getState().setPreview(undefined);
    };
  }, []);

  useEffect(() => {
    setPreview(preview ? upgrade : undefined);
  }, [preview, upgrade, setPreview]);

  const situation =
    c.kind === "lease"
      ? `Lease ends in ${c.monthsRemaining} ${c.monthsRemaining === 1 ? "month" : "months"}. ${miles(v.odometer)} miles on the clock.`
      : `${c.monthsRemaining} payments left at ${c.apr}% APR. ${miles(v.odometer)} miles on the clock.`;

  return (
    <section ref={ref} aria-labelledby="hero-h" className="relative h-[170vh]">
      <div className="sticky top-[var(--hdr)] h-[calc(100dvh-var(--hdr))] overflow-hidden">
        {/* Drag area over the car (right half on desktop, top half on phones). */}
        <DragSurface className="absolute inset-x-0 top-0 h-[48%] lg:inset-y-0 lg:right-0 lg:left-[44%] lg:h-auto" />
        <motion.div style={{ y, opacity }} className="pointer-events-none relative mx-auto flex h-full w-full max-w-[1440px] flex-col justify-end px-5 pb-8 sm:px-10 lg:justify-center lg:pb-0">
          <div className="pointer-events-auto max-w-[560px]">
            <p className="text-[15px] text-ink-2">{data.persona.name}&apos;s car</p>
            <h1 id="hero-h" className="font-display mt-2 text-[clamp(44px,6.2vw,96px)] leading-[0.95] tracking-[-0.035em] text-ink">
              {v.year} Toyota
              <br />
              {v.model}
            </h1>
            <p className="mt-5 max-w-[42ch] text-[17px] leading-relaxed text-ink-2">{situation}</p>

            {opt && (
              <div className="glass mt-8 rounded-xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-[13px] font-medium text-accent-ink">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                    Recommended next move
                  </span>
                  {opt.deadline && <span className="text-xs font-medium text-warn">Decide by {shortDate(opt.deadline)}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h2 className="font-display text-[22px] leading-tight text-ink">{opt.title}</h2>
                  {impact && (
                    <p className="num text-[22px] font-semibold text-ink">
                      {money(impact.value)}
                      <span className="text-sm font-medium text-ink-3">{impact.suffix}</span>
                    </p>
                  )}
                </div>
                {impact && <p className="mt-0.5 text-sm text-ink-3">{impact.caption}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => setOpenMove(opt.moveType)}>
                    Compare options
                  </Button>
                  <Button variant="outline" onClick={() => openWhy(opt.id)}>
                    <Info size={15} />
                    Why this?
                  </Button>
                  {upgrade && (
                    <Button variant="ghost" onClick={() => setPreviewOn((p) => !p)} aria-pressed={preview}>
                      {preview ? <EyeOff size={15} /> : <Eye size={15} />}
                      {preview ? "Hide the new car" : `Show the ${upgrade.name.replace(/^\d{4} Toyota /, "")}`}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        <motion.div style={{ opacity: cueOpacity }} className="pointer-events-none absolute inset-x-0 bottom-5 hidden items-center justify-between px-10 text-[13px] text-ink-3 lg:flex">
          <span className="inline-flex items-center gap-2">
            <ArrowDown size={14} className="story-bob" />
            Scroll to look around the car
          </span>
          <span className="inline-flex items-center gap-2">
            <MoveHorizontal size={14} />
            Drag the car to turn it
          </span>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- chapters

function ContractChapter({ data }: { data: DashboardData }) {
  const c = data.persona.contract;
  const v = data.persona.vehicle;
  const lease = leaseFacts(data);
  if (c.kind === "lease" && lease) {
    const over = lease.overMiles > 0;
    const used = lease.projectedOdo - lease.startOdo;
    const scale = Math.max(lease.allowanceTotal, used) * 1.04;
    const usedShare = used / scale;
    const allowShare = lease.allowanceTotal / scale;
    const line = over
      ? `At ${miles(lease.monthlyMiles)} miles a month, you'll return the car ${miles(lease.overMiles)} miles over your allowance.`
      : `At ${miles(lease.monthlyMiles)} miles a month, you'll return the car with ${miles(lease.limitOdo - lease.projectedOdo)} miles to spare.`;
    return (
      <Chapter id="ch-miles" from="sideWide" to="odometer" side="right" calloutText={`${miles(v.odometer)} mi today`}>
        {(p) => (
          <ScrubReveal progress={p}>
            <Kicker>Your lease</Kicker>
            <ScrubText as="h2" text={line} progress={p} className="font-display mt-3 text-[clamp(28px,3vw,44px)] leading-[1.08] tracking-[-0.02em] text-ink" />
            <div className="mt-8">
              <p className="num text-[clamp(44px,5vw,72px)] leading-none font-semibold tracking-[-0.03em] text-ink">
                <ScrubNumber progress={p} from={v.odometer} to={lease.projectedOdo} />
                <span className="ml-2 text-[0.32em] font-medium text-ink-3">mi</span>
              </p>
              <p className="mt-2 text-[15px] text-ink-2">on the odometer when the lease ends, against a limit of {miles(lease.limitOdo)}.</p>
              <Bar progress={p} to={usedShare} tone={over ? "warn" : "good"} marker={allowShare} />
              <div className="mt-2 flex justify-between text-[13px] text-ink-3">
                <span>Projected</span>
                <span>Allowance</span>
              </div>
            </div>
            <Link href="/moves" className="story-link mt-8">
              Compare lease-end options <ArrowRight size={15} />
            </Link>
          </ScrubReveal>
        )}
      </Chapter>
    );
  }
  if (c.kind !== "loan") return null;
  const paid = (c.termMonths - c.monthsRemaining) / c.termMonths;
  return (
    <Chapter id="ch-miles" from="sideWide" to="odometer" side="right" calloutText={`${miles(v.odometer)} mi today`}>
      {(p) => (
        <ScrubReveal progress={p}>
          <Kicker>Your loan</Kicker>
          <ScrubText as="h2" text={`${c.monthsRemaining} payments of ${money(c.monthlyPayment)} left, at ${c.apr}% APR.`} progress={p} className="font-display mt-3 text-[clamp(28px,3vw,44px)] leading-[1.08] tracking-[-0.02em] text-ink" />
          <div className="mt-8">
            <p className="num text-[clamp(44px,5vw,72px)] leading-none font-semibold tracking-[-0.03em] text-ink">
              $<ScrubNumber progress={p} from={0} to={c.principalRemaining} />
            </p>
            <p className="mt-2 text-[15px] text-ink-2">still owed on the loan.</p>
            <Bar progress={p} to={paid} />
            <div className="mt-2 flex justify-between text-[13px] text-ink-3">
              <span>{Math.round(paid * 100)}% of the term paid</span>
              <span>{c.termMonths} months</span>
            </div>
          </div>
          <Link href="/finances" className="story-link mt-8">
            See your payments <ArrowRight size={15} />
          </Link>
        </ScrubReveal>
      )}
    </Chapter>
  );
}

function DrivingChapter({ data }: { data: DashboardData }) {
  const d = data.driving;
  const tripMiles = data.trips.reduce((a, t) => a + t.miles, 0);
  const brakes = data.trips.reduce((a, t) => a + t.hardBrakes, 0);
  const trail = d.categoryMiles?.trailhead ?? 0;
  const callout = trail > 0 ? `${miles(trail)} trail miles` : `${brakes} hard brakes in 90 days`;
  if (!data.persona.consent.driving) {
    return (
      <Chapter id="ch-driving" from="tiresWide" to="tires" side="left" calloutText="Driving data off" height="h-[200vh]">
        {(p) => (
          <ScrubReveal progress={p}>
            <Kicker>Your driving</Kicker>
            <ScrubText as="h2" text="Driving data is off, so your score and trips stay private." progress={p} className="font-display mt-3 text-[clamp(28px,3vw,44px)] leading-[1.08] tracking-[-0.02em] text-ink" />
            <p className="mt-4 text-[15px] text-ink-2">Lease math uses your contract allowance instead. Turn it on from Your data in the top bar.</p>
          </ScrubReveal>
        )}
      </Chapter>
    );
  }
  const factors = [...d.scoreFactors].filter((f) => Math.round(f.impact * 10) !== 0).sort((a, b) => a.impact - b.impact).slice(0, 3);
  const max = Math.max(1, ...factors.map((f) => Math.abs(f.impact)));
  return (
    <Chapter id="ch-driving" from="tiresWide" to="tires" side="left" calloutText={callout}>
      {(p) => (
        <ScrubReveal progress={p}>
          <Kicker>Your driving</Kicker>
          <ScrubText
            as="h2"
            text={`${data.trips.length} trips and ${miles(tripMiles)} miles in the last 90 days.`}
            progress={p}
            className="font-display mt-3 text-[clamp(28px,3vw,44px)] leading-[1.08] tracking-[-0.02em] text-ink"
          />
          <div className="mt-8 flex items-end gap-8">
            <div>
              <p className="num text-[clamp(56px,6vw,88px)] leading-none font-semibold tracking-[-0.04em] text-ink">
                <ScrubNumber progress={p} from={0} to={d.score} />
              </p>
              <p className="mt-2 text-[15px] text-ink-2">driving score, out of 100</p>
            </div>
            {d.smoothStreak >= 3 && <p className="mb-1 text-[15px] text-good">{d.smoothStreak} smooth trips in a row</p>}
          </div>
          {factors.length > 0 && (
            <ul className="mt-7 space-y-3" aria-label="What lowers your score most">
              {factors.map((f) => (
                <li key={f.factor} className="grid grid-cols-[8.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-[15px]">
                  <span className="text-ink-2">{f.factor}</span>
                  <FactorBar progress={p} share={Math.abs(f.impact) / max} />
                  <span className="num text-right font-semibold text-warn">{f.impact.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/driving" className="story-link mt-8">
            See every trip <ArrowRight size={15} />
          </Link>
        </ScrubReveal>
      )}
    </Chapter>
  );
}

function FactorBar({ progress, share }: { progress: MotionValue<number>; share: number }) {
  const reduced = useUiStore((s) => s.reducedMotion);
  const width = useTransform(progress, [0.3, 0.6], reduced ? [`${share * 100}%`, `${share * 100}%`] : ["0%", `${share * 100}%`]);
  return (
    <span className="h-1.5 rounded-full bg-line-2" aria-hidden>
      <motion.span className="block h-full rounded-full bg-warn" style={{ width }} />
    </span>
  );
}

function ProtectionChapter({ data }: { data: DashboardData }) {
  const tc = data.persona.toyotaCare;
  const start = new Date(tc.startDate + "T12:00:00Z");
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + tc.expiresMonths);
  const endLabel = end.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const ended = end.getTime() < Date.parse("2026-10-27T12:00:00Z");
  const e = data.engines.protection;
  const prot = e?.options.find((o) => o.id !== e.baselineOptionId && o.eligible);
  const line = ended
    ? `ToyotaCare ended in ${endLabel}. Service and repairs are now yours to cover.`
    : `ToyotaCare covers scheduled service until ${endLabel} or ${miles(tc.expiresMiles)} miles.`;
  return (
    <Chapter id="ch-protection" from="frontWide" to="engine" side="right" calloutText={prot?.monthlyCost ? `${prot.title} · $${Math.round(prot.monthlyCost)}/mo` : "ToyotaCare"}>
      {(p) => (
        <ScrubReveal progress={p}>
          <Kicker>Protection</Kicker>
          <ScrubText as="h2" text={line} progress={p} className="font-display mt-3 text-[clamp(28px,3vw,44px)] leading-[1.08] tracking-[-0.02em] text-ink" />
          {prot?.monthlyCost != null ? (
            <div className="mt-8">
              <p className="num text-[clamp(44px,5vw,72px)] leading-none font-semibold tracking-[-0.03em] text-ink">
                $<ScrubNumber progress={p} from={0} to={prot.monthlyCost} />
                <span className="ml-1 text-[0.32em] font-medium text-ink-3">/mo</span>
              </p>
              <p className="mt-2 max-w-[40ch] text-[15px] text-ink-2">{prot.title}. {prot.summary}</p>
            </div>
          ) : (
            <p className="mt-6 text-[15px] text-ink-2">No extra coverage is recommended for this car right now.</p>
          )}
          <Link href="/moves" className="story-link mt-8">
            Compare coverage <ArrowRight size={15} />
          </Link>
        </ScrubReveal>
      )}
    </Chapter>
  );
}

function InsuranceChapter({ data }: { data: DashboardData }) {
  const ins = data.persona.insurance;
  const e = data.engines.insurance;
  const ubi = e.options.find((o) => o.id !== e.baselineOptionId && o.eligible);
  const cheaper = ubi?.monthlyCost != null && ubi.monthlyCost < ins.monthlyPremium;
  const line =
    ubi?.monthlyCost != null
      ? cheaper
        ? `Insurers would charge less for the way you drive: ${money(ubi.monthlyCost)} a month instead of ${money(ins.monthlyPremium)}.`
        : `A usage-based policy would cost more for now: ${money(ubi.monthlyCost)} a month against your ${money(ins.monthlyPremium)}.`
      : `You pay ${money(ins.monthlyPremium)} a month with ${ins.carrier}.`;
  return (
    <Chapter
      id="ch-insurance"
      from="rearWide"
      to="seat"
      side="left"
      calloutText={data.persona.consent.driving ? `Driving score ${Math.round(data.driving.score)}` : "Driving data off"}
    >
      {(p) => (
        <ScrubReveal progress={p}>
          <Kicker>Insurance</Kicker>
          <ScrubText as="h2" text={line} progress={p} className="font-display mt-3 text-[clamp(28px,3vw,44px)] leading-[1.08] tracking-[-0.02em] text-ink" />
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <p className="num text-[clamp(36px,3.6vw,56px)] leading-none font-semibold tracking-[-0.03em] text-ink">
                $<ScrubNumber progress={p} from={0} to={ins.monthlyPremium} />
              </p>
              <p className="mt-2 text-[15px] text-ink-2">a month now, {ins.carrier}</p>
            </div>
            {ubi?.monthlyCost != null && (
              <div>
                <p className={clsx("num text-[clamp(36px,3.6vw,56px)] leading-none font-semibold tracking-[-0.03em]", cheaper ? "text-good" : "text-warn")}>
                  $<ScrubNumber progress={p} from={0} to={ubi.monthlyCost} range={[0.2, 0.6]} />
                </p>
                <p className="mt-2 text-[15px] text-ink-2">usage-based quote</p>
              </div>
            )}
          </div>
          <Link href="/moves" className="story-link mt-8">
            Compare insurance <ArrowRight size={15} />
          </Link>
        </ScrubReveal>
      )}
    </Chapter>
  );
}

// ---------------------------------------------------------------- finale

function Finale({ data }: { data: DashboardData }) {
  const ref = useRef<HTMLElement>(null);
  const setOpenMove = useUiStore((s) => s.setOpenMove);
  const openWhy = useOverlayStore((s) => s.openWhy);
  const progress = useScrollShot(ref, "finale", "finaleClose", { calloutText: "" });
  const top = data.ranked[0];
  const opt = top ? findOption(data, top.optionId) : undefined;
  const impact = opt ? impactOf(opt) : null;
  return (
    <>
      <section ref={ref} aria-labelledby="finale-h" className="relative h-[200vh]">
        <div className="sticky top-[var(--hdr)] h-[calc(100dvh-var(--hdr))] overflow-hidden">
          <DragSurface className="absolute inset-x-0 bottom-0 h-[52%]" />
          <ScrubReveal progress={progress} inAt={[0.02, 0.14]} outAt={[1, 1]} className="pointer-events-none relative mx-auto flex max-w-[900px] flex-col items-center px-5 pt-[7vh] text-center sm:px-10">
            <p className="text-[15px] font-medium text-accent-ink">Your next move</p>
            <h2 id="finale-h" className="font-display mt-3 text-[clamp(36px,5vw,76px)] leading-[1] tracking-[-0.035em] text-balance text-ink">
              {opt ? opt.title : "Nothing urgent right now"}
            </h2>
            {opt && impact ? (
              <p className="mt-4 text-[17px] text-ink-2">
                <span className="num font-semibold text-ink">
                  {money(impact.value)}
                  {impact.suffix}
                </span>{" "}
                {impact.caption}
                {opt.deadline ? `. Decide by ${shortDate(opt.deadline)}.` : "."}
              </p>
            ) : (
              <p className="mt-4 text-[17px] text-ink-2">Your lease or loan, insurance and protection all look on track.</p>
            )}
            {opt && (
              <div className="pointer-events-auto mt-7 flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="lg" onClick={() => setOpenMove(opt.moveType)}>
                  Compare options
                </Button>
                <Button variant="outline" size="lg" onClick={() => openWhy(opt.id)}>
                  <Info size={16} />
                  Why this?
                </Button>
              </div>
            )}
          </ScrubReveal>
        </div>
      </section>
      <section aria-labelledby="all-moves-h" className="relative z-[2] bg-[var(--bg)] before:pointer-events-none before:absolute before:inset-x-0 before:-top-40 before:h-40 before:bg-gradient-to-t before:from-[var(--bg)] before:to-transparent">
        <div className="mx-auto max-w-[1440px] px-5 pt-4 pb-16 sm:px-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="all-moves-h" className="font-display text-[28px] text-ink sm:text-[32px]">
            Every move, ranked
          </h2>
          <Link href="/moves" className="story-link">
            Explore moves <ArrowRight size={15} />
          </Link>
        </div>
        <MoveTiles data={data} />
        </div>
      </section>
    </>
  );
}
