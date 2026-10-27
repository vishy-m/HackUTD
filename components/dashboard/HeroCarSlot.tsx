"use client";

// Hosts task 04's <HeroCar/> (client-only, lazy). While the 3D chunk loads, the painted 2D
// silhouette holds the stage so the hero never paints empty.

import dynamic from "next/dynamic";
import type { Hotspot, MoveOption, MoveType, Vehicle } from "@/lib/types";
import { useUiStore } from "@/lib/client/ui-store";
import { CarSilhouette } from "./CarSilhouette";

function Loading({ vehicle }: { vehicle?: Vehicle }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="w-[80%] max-w-[520px] opacity-80">
        {vehicle ? <CarSilhouette bodyStyle={vehicle.bodyStyle} paint={vehicle.paintHex} className="h-auto w-full" /> : <div className="skeleton h-24 w-full rounded-[40px]" />}
      </div>
    </div>
  );
}

const HeroCar = dynamic(() => import("@/components/three/HeroCar"), { ssr: false, loading: () => null });

const hotspotMove: Record<Hotspot, MoveType> = {
  odometer: "lease-end",
  tires: "protection",
  engine: "protection",
  "driver-seat": "insurance",
};

export function HeroCarSlot({
  vehicle,
  upgradePreview,
  hotspotLabels,
  className,
}: {
  vehicle: Vehicle;
  upgradePreview?: MoveOption["upgradeModel"];
  hotspotLabels?: Partial<Record<Hotspot, string>>;
  className?: string;
}) {
  const setPanel = useUiStore((s) => s.setAgentPanelOpen);
  const reduced = useUiStore((s) => s.reducedMotion);
  // Hotspot → bring the matching recommendation card into view in the copilot panel.
  const onHotspotSelect = (h: Hotspot) => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    setPanel(true);
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-move="${hotspotMove[h]}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
      el.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
    }, 120);
  };
  return (
    <div className={className}>
      <div className="absolute inset-0" aria-hidden>
        <Loading vehicle={vehicle} />
      </div>
      <HeroCar vehicle={vehicle} upgradePreview={upgradePreview} hotspotLabels={hotspotLabels} onHotspotSelect={onHotspotSelect} className="h-full w-full" />
    </div>
  );
}
