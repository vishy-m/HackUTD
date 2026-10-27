"use client";

import { animate, useMotionValue, useTransform, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useUiStore } from "@/lib/client/ui-store";

/** Counts smoothly to `value` on change (springy, ~600ms). Instant under reduced motion. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduced = useUiStore((s) => s.reducedMotion);
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduced) {
      first.current = false;
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { type: "spring", stiffness: 90, damping: 20, restDelta: 0.5 });
    return () => c.stop();
  }, [value, reduced, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}
