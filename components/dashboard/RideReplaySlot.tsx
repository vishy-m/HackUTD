"use client";

// Large overlay that hosts task 04's <RideReplay/> whenever useUiStore.replay is set
// (from a Replay button, an insight link, or the agent's open_trip_replay action).

import { Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTrip } from "@/lib/client/api";
import { useMounted } from "@/lib/client/hooks";
import { useDataStore } from "@/lib/client/data-store";
import { useUiStore } from "@/lib/client/ui-store";
import type { Trip } from "@/lib/types";

function ReplayLoading({ label = "Loading the 3D map…" }: { label?: string }) {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="flex items-center gap-3 text-sm text-ink-2">
        <Loader2 size={18} className="animate-spin" />
        {label}
      </div>
    </div>
  );
}

const RideReplay = dynamic(() => import("@/components/map/RideReplay"), {
  ssr: false,
  loading: () => <ReplayLoading />,
});

export function RideReplaySlot() {
  const replay = useUiStore((s) => s.replay);
  const openReplay = useUiStore((s) => s.openReplay);
  const reduced = useUiStore((s) => s.reducedMotion);
  const personaId = useUiStore((s) => s.personaId);
  const paint = useDataStore((s) => s.dashboards[personaId]?.persona.vehicle.paintHex);
  const [loaded, setLoaded] = useState<{ id: string; trip?: Trip; error?: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tripId = replay?.tripId;
  const mounted = useMounted();
  const current = loaded && loaded.id === tripId ? loaded : null;
  const trip = current?.trip ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    if (!tripId) return;
    let alive = true;
    getTrip(tripId)
      .then((t) => alive && setLoaded({ id: tripId, trip: t }))
      .catch((e) => alive && setLoaded({ id: tripId, error: e instanceof Error ? e.message : "Trip not found" }));
    return () => {
      alive = false;
    };
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openReplay(null);
    };
    document.addEventListener("keydown", onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = ov;
      prev?.focus?.();
    };
  }, [tripId, openReplay]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {replay && (
        <motion.div
          className="fixed inset-0 z-[55] bg-black/60 p-0 backdrop-blur-sm sm:p-4 lg:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={trip ? `Trip replay: ${trip.destinationLabel}` : "Trip replay"}
        >
          <motion.div
            className="glass-strong relative h-full w-full overflow-hidden sm:rounded-xl"
            initial={reduced ? false : { scale: 0.97, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={reduced ? undefined : { scale: 0.98, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {error ? (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <p className="text-ink">This trip couldn&apos;t be loaded ({error}).</p>
                  <button ref={closeRef} type="button" onClick={() => openReplay(null)} className="mt-4 rounded-lg border border-line-2 px-4 py-2 text-sm text-ink">
                    Back to dashboard
                  </button>
                </div>
              </div>
            ) : trip ? (
              <RideReplay trip={trip} onClose={() => openReplay(null)} paintHex={paint} className="h-full w-full" />
            ) : (
              <ReplayLoading label="Loading trip…" />
            )}
            {!trip && (
              <button
                type="button"
                onClick={() => openReplay(null)}
                aria-label="Close replay"
                className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-[var(--glass-hi)] hover:text-ink"
              >
                <X size={18} />
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
