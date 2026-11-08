"use client";

import { useEffect } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { WhyDrawer } from "@/components/agent/WhyDrawer";
import { AcceptModal } from "@/components/agent/AcceptModal";
import { useDataStore } from "@/lib/client/data-store";
import { useReducedMotionSync } from "@/lib/client/hooks";
import { useUiStore } from "@/lib/client/ui-store";
import { RepairAdvisor } from "@/components/repair/RepairAdvisor";
import { ConsentSheet } from "./ConsentSheet";
import { ContractCard } from "./ContractCard";
import { DrivingLife } from "./DrivingLife";
import { Footer } from "./Footer";
import { HeroStage } from "./HeroStage";
import { MoneyCard } from "./MoneyCard";
import { MoveDrawer } from "./MoveDrawer";
import { MoveTiles } from "./MoveTiles";
import { RideReplaySlot } from "./RideReplaySlot";
import { TopBar } from "./TopBar";

export type DashboardPage = "overview" | "moves" | "finances" | "driving" | "repair";

const pageCopy: Record<Exclude<DashboardPage, "overview">, { eyebrow: string; title: string; description: string }> = {
  moves: {
    eyebrow: "Decision center",
    title: "Your next moves",
    description: "Compare the opportunities that matter now, ranked around your vehicle, contract, and preferences.",
  },
  finances: {
    eyebrow: "Financial picture",
    title: "Contract & money",
    description: "See your vehicle agreement and monthly cash flow together, without digging through statements.",
  },
  driving: {
    eyebrow: "On the road",
    title: "Driving insights",
    description: "Understand how your mileage and driving patterns can shape costs, coverage, and future options.",
  },
  repair: {
    eyebrow: "Vehicle decision",
    title: "Repair or replace?",
    description: "Compare the paths using your vehicle, repair, and budget.",
  },
};

function PageIntro({ page }: { page: Exclude<DashboardPage, "overview"> }) {
  const copy = pageCopy[page];
  return (
    <div className="px-1 pt-1 pb-1 sm:pt-2">
      <p className="text-xs font-semibold tracking-[0.16em] text-accent-ink uppercase">{copy.eyebrow}</p>
      <h1 className="font-display mt-2 text-3xl leading-tight font-semibold text-ink sm:text-4xl">{copy.title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2 sm:text-base">{copy.description}</p>
    </div>
  );
}

export function AppShell({ page = "overview" }: { page?: DashboardPage }) {
  useReducedMotionSync();
  const personaId = useUiStore((s) => s.personaId);
  const panelOpen = useUiStore((s) => s.agentPanelOpen);
  // Keep the previous persona on screen until the next one loads: no skeleton flash, and the
  // 3D car stays mounted so task 04's drive-off / roll-in plays on the vehicle prop change.
  const data = useDataStore((s) => s.dashboards[personaId] ?? s.lastDashboard);
  const error = useDataStore((s) => s.dashboardError);
  const loadDashboard = useDataStore((s) => s.loadDashboard);
  const loadAgent = useDataStore((s) => s.loadAgent);

  useEffect(() => {
    void loadDashboard(personaId);
    void loadAgent(personaId);
  }, [personaId, loadDashboard, loadAgent]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar data={data} />
      <div
        className={
          "mx-auto grid w-full max-w-[1680px] flex-1 grid-cols-1 gap-5 px-4 pb-28 sm:px-6 lg:gap-6 lg:pb-8 " +
          (panelOpen ? "lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_428px]" : "lg:grid-cols-[minmax(0,1fr)_64px]")
        }
      >
        <main id="main" className="min-w-0 space-y-5 lg:space-y-6">
          {error && !data ? (
            <div role="alert" className="glass rounded-[22px] p-6 text-sm text-ink-2">
              Your dashboard didn&apos;t load ({error}). Check that the dev server is running, then reload the page.
            </div>
          ) : null}
          {page === "overview" && (
            <>
              <HeroStage data={data} />
              <MoveTiles data={data} />
            </>
          )}
          {page === "moves" && (
            <>
              <PageIntro page="moves" />
              <MoveTiles data={data} />
            </>
          )}
          {page === "finances" && (
            <>
              <PageIntro page="finances" />
              <div className="grid grid-cols-1 gap-5 lg:gap-6 2xl:grid-cols-2">
                <ContractCard data={data} />
                <MoneyCard data={data} />
              </div>
            </>
          )}
          {page === "driving" && (
            <>
              <PageIntro page="driving" />
              <DrivingLife data={data} />
            </>
          )}
          {page === "repair" && <RepairAdvisor key={data?.persona.id ?? "loading"} data={data} />}
          <Footer />
        </main>
        <AgentPanel data={data} />
      </div>

      <MoveDrawer data={data} />
      <WhyDrawer data={data} />
      <AcceptModal data={data} />
      <ConsentSheet data={data} />
      <RideReplaySlot />
    </div>
  );
}
