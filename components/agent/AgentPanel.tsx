"use client";

import clsx from "clsx";
import { Bell, Check, ChevronDown, FileText, MessageSquareText, PhoneCall, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Overlay";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDataStore } from "@/lib/client/data-store";
import { useMinWidth } from "@/lib/client/hooks";
import { useUiStore } from "@/lib/client/ui-store";
import type { DashboardData, Draft, Preferences } from "@/lib/types";
import { ChatInput, ChatThread } from "./Chat";
import { Markdown } from "./Markdown";
import { RecommendationCard } from "./RecommendationCard";

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
      {children}
      {count != null && count > 0 && <span className="num rounded-full bg-[var(--glass-hi)] px-1.5 text-[11px] text-ink-3">{count}</span>}
    </h2>
  );
}

const draftIcon: Record<Draft["type"], typeof FileText> = {
  comparison: FileText,
  message: MessageSquareText,
  reminder: Bell,
  plan: FileText,
};

function DraftItem({ d }: { d: Draft }) {
  const [open, setOpen] = useState(false);
  const Icon = draftIcon[d.type];
  return (
    <li className="rounded-lg border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left hover:bg-[var(--glass-hi)]"
      >
        <Icon size={15} className="shrink-0 text-ink-3" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{d.title}</span>
        <span className="text-[11px] text-ink-3 capitalize">{d.type}</span>
        <ChevronDown size={14} className={clsx("shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Markdown text={d.body} className="px-3.5 pb-3 text-[13px] leading-relaxed text-ink-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function StyleControls({ data }: { data?: DashboardData }) {
  const setStyle = useDataStore((s) => s.setStyle);
  if (!data) return null;
  return (
    <Segmented<Preferences["detailLevel"]>
      size="sm"
      label="Explanation detail"
      value={data.preferences.detailLevel}
      onChange={(v) => void setStyle(data.persona.id, { detailLevel: v })}
      options={[
        { value: "brief", label: "Brief" },
        { value: "standard", label: "Standard" },
        { value: "show-math", label: "Show math" },
      ]}
    />
  );
}

function PanelBody({ data }: { data?: DashboardData }) {
  const personaId = useUiStore((s) => s.personaId);
  const agent = useDataStore((s) => s.agent[personaId]);
  const deleteLearned = useDataStore((s) => s.deleteLearned);
  const steps = useDataStore((s) => s.nextSteps).filter((n) => n.personaId === personaId);
  const recs = agent?.recommendations.filter((r) => r.status !== "dismissed") ?? [];
  const primaryId = recs.find((r) => r.status === "proposed")?.id;

  return (
    <div className="space-y-7">
        <section aria-labelledby="sec-next">
          <SectionTitle>
            <span id="sec-next">Recommendations</span>
          </SectionTitle>
          {!agent ? (
            <div className="space-y-3" aria-busy>
              <Skeleton className="h-[148px] rounded-xl" />
              <Skeleton className="h-[120px] rounded-xl" />
            </div>
          ) : recs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-2 p-4 text-[13px] text-ink-2">
              No open recommendations. Ask a what-if below and I&apos;ll draft new ones.
            </p>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {recs.map((r) => (
                  <motion.li key={r.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, height: 0, marginTop: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
                    <RecommendationCard rec={r} primary={r.id === primaryId} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {steps.length > 0 && (
          <section aria-labelledby="sec-steps">
            <SectionTitle count={steps.length}>
              <span id="sec-steps">Next steps</span>
            </SectionTitle>
            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-lg bg-good-soft px-3.5 py-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-good text-bg">
                    {s.mode === "specialist-callback" ? <PhoneCall size={12} /> : <Check size={13} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-ink">{s.label}</div>
                    <div className="text-xs text-ink-2">{s.mode === "specialist-callback" ? "A TFS specialist will call you within 1 business day" : "Confirmation sent (simulated)"}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {agent && agent.drafts.length > 0 && (
          <section aria-labelledby="sec-drafts">
            <SectionTitle count={agent.drafts.length}>
              <span id="sec-drafts">Drafts</span>
            </SectionTitle>
            <ul className="space-y-2">
              {agent.drafts.map((d) => (
                <DraftItem key={d.id} d={d} />
              ))}
            </ul>
          </section>
        )}

        {agent && (
          <section aria-labelledby="sec-learned">
            <SectionTitle>
              <span id="sec-learned">What I&apos;ve learned</span>
            </SectionTitle>
            {agent.learned.length === 0 ? (
              <p className="text-[13px] text-ink-3">Nothing yet. Accept or dismiss a move and I&apos;ll note what you prefer.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {agent.learned.map((l) => (
                    <motion.li
                      key={l.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-lg border border-line bg-[var(--glass-hi)] py-1 pr-1 pl-3 text-[13px] leading-snug text-ink"
                      title={`From ${l.source} · ${Math.round(l.confidence * 100)}% confident`}
                    >
                      {l.statement}
                      <button
                        type="button"
                        onClick={() => void deleteLearned(personaId, l.id)}
                        aria-label={`Forget: ${l.statement}`}
                        className="grid size-6 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-line hover:text-ink"
                      >
                        <X size={12} />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        )}

        <section aria-labelledby="sec-chat" className="border-t border-line pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="sec-chat" className="text-[13px] font-semibold text-ink-2">
              Chat
            </h2>
            <StyleControls data={data} />
          </div>
          <ChatThread data={data} />
        </section>
    </div>
  );
}

function PanelHeader({ data, onClose }: { data?: DashboardData; onClose?: () => void }) {
  const streaming = useDataStore((s) => s.streaming);
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-9 place-items-center rounded-lg bg-ink text-bg">
        <MessageSquareText size={17} />
        {streaming && <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-accent ring-2 ring-[var(--bg)]" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[17px] text-ink">Copilot</div>
        <div className="truncate text-xs text-ink-3">{data ? `For ${data.persona.name} · figures from your contract and trips` : "Loading…"}</div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Hide copilot" className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-[var(--glass-hi)] hover:text-ink">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function AgentPanel({ data }: { data?: DashboardData }) {
  const desktop = useMinWidth(1024);
  const open = useUiStore((s) => s.agentPanelOpen);
  const setOpen = useUiStore((s) => s.setAgentPanelOpen);
  const personaId = useUiStore((s) => s.personaId);
  const recCount = useDataStore((s) => s.agent[personaId]?.recommendations.filter((r) => r.status === "proposed").length ?? 0);
  const reduced = useUiStore((s) => s.reducedMotion);

  // On phones/tablets the panel is a bottom sheet: start closed so the dashboard shows first.
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) setOpen(false);
  }, [setOpen]);

  if (!desktop) {
    return (
      <>
        <AnimatePresence>
          {!open && (
            <motion.button
              type="button"
              onClick={() => setOpen(true)}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="glass-strong fixed right-4 bottom-4 z-40 flex h-14 items-center gap-3 rounded-lg p-2 sm:pr-5"
              aria-label="Open copilot"
            >
              <span className="relative grid size-10 place-items-center rounded-md bg-ink text-bg">
                <MessageSquareText size={18} />
                {recCount > 0 && <span className="num absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">{recCount}</span>}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold text-ink">Copilot</span>
                <span className="block text-xs text-ink-3">{recCount ? `${recCount} recommendations` : "Ask about your car or contract"}</span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
        <Drawer open={open} onClose={() => setOpen(false)} title="Copilot" subtitle={data ? `Drafted for ${data.persona.name}` : undefined} labelledBy="copilot-sheet-title" footer={<ChatInput />}>
          <PanelBody key={data?.persona.id ?? "loading"} data={data} />
        </Drawer>
      </>
    );
  }

  // Desktop: a floating button, and a panel that slides over the stage from the right.
  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="copilot-fab"
            type="button"
            onClick={() => setOpen(true)}
            initial={reduced ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass-strong fixed right-6 bottom-6 z-40 flex h-14 items-center gap-3 rounded-lg py-2 pr-5 pl-2 transition-transform hover:-translate-y-0.5"
            aria-label="Open copilot"
          >
            <span className="relative grid size-10 place-items-center rounded-md bg-ink text-bg">
              <MessageSquareText size={18} />
              {recCount > 0 && <span className="num absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">{recCount}</span>}
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold text-ink">Copilot</span>
              <span className="block text-xs text-ink-3">{recCount ? `${recCount} recommendations` : "Ask about your car or contract"}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.aside
            key="copilot-panel"
            aria-label="Copilot"
            initial={reduced ? false : { x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="glass-strong fixed top-[calc(var(--hdr)+12px)] right-4 bottom-4 z-40 flex w-[420px] flex-col overflow-hidden rounded-xl"
          >
            <div className="border-b border-line px-5 py-4">
              <PanelHeader data={data} onClose={() => setOpen(false)} />
            </div>
            <div data-scroll className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <PanelBody key={data?.persona.id ?? "loading"} data={data} />
            </div>
            <div className="border-t border-line px-4 py-3.5">
              <ChatInput />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
