"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useUiStore } from "@/lib/client/ui-store";

export function PageEnter({ children }: { children: ReactNode }) {
  const reduced = useUiStore((s) => s.reducedMotion);
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
    >
      {children}
    </motion.div>
  );
}
