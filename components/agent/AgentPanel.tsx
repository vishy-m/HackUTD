"use client";

import clsx from "clsx";
import { Check, ChevronDown, FileText, MessageSquareText, PhoneCall, Sparkles, X } from "lucide-react";
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
  reminder: Sparkles,
  plan: FileText,
};

function DraftItem({ d }: { d: Draft }) {
  const [open, setOpen] = useState(false);
  const Icon = draftIcon[d.type];
  return (
    <li className="rounded-2xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left hover:bg-[var(--glass-hi)]"
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
            <span id="sec-next">Your next move</span>
          </SectionTitle>
          {!agent ? (
            <div className="space-y-3" aria-busy>
              <Skeleton className="h-[148px] rounded-[20px]" />
              <Skeleton className="h-[120px] rounded-[20px]" />
            </div>
          ) : recs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-2 p-4 text-[13px] text-ink-2">
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
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-good-soft px-3.5 py-2.5">
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
                      className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-2xl border border-line bg-[var(--glass-hi)] py-1 pr-1 pl-3 text-[13px] leading-snug text-ink"
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
      <span className="relative grid size-9 place-items-center rounded-xl bg-ink text-bg">
        <Sparkles size={17} />
        {streaming && <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full bg-accent ring-2 ring-[var(--bg)]" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-semibold text-ink">Copilot</div>
        <div className="truncate text-xs text-ink-3">{data ? `Drafted for ${data.persona.name} · every number from the engines` : "Getting ready…"}</div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Hide copilot" className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-[var(--glass-hi)] hover:text-ink">
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
              className="glass-strong fixed bottom-4 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-3 rounded-full py-2 pr-5 pl-2 shadow-2xl"
              aria-label="Open copilot"
            >
              <span className="grid size-10 place-items-center rounded-full bg-ink text-bg">
                <Sparkles size={18} />
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-ink">Copilot</span>
                <span className="block text-xs text-ink-3">{recCount ? `${recCount} moves drafted` : "Ask anything"}</span>
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

  if (!open) {
    return (
      <aside className="sticky top-[88px] h-fit">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show copilot panel"
          className="glass flex w-16 flex-col items-center gap-3 rounded-[22px] py-4 text-ink-2 hover:text-ink"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-ink text-bg">
            <Sparkles size={17} />
          </span>
          {recCount > 0 && <span className="num text-xs font-semibold">{recCount}</span>}
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Copilot" className="glass sticky top-[88px] flex h-[calc(100dvh-104px)] min-h-[520px] flex-col overflow-hidden rounded-[26px]">
      <div className="border-b border-line px-5 py-4">
        <PanelHeader data={data} onClose={() => setOpen(false)} />
      </div>
      <div data-scroll className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <PanelBody key={data?.persona.id ?? "loading"} data={data} />
      </div>
      <div className="border-t border-line px-4 py-3.5">
        <ChatInput />
      </div>
    </aside>
  );
}
