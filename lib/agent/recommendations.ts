import { z } from "zod";
import type { AgentPanelState, DashboardData, MoveOption, PersonaId, Recommendation } from "../types";
import { getDashboard } from "../server/dashboard";
import { getState, panelFromState, runtimeStore } from "../server/store";
import { getClient, modelConfig } from "./client";
import { systemPrompt } from "./prompt";
import { checkGrounding } from "./grounding";

export function topOptions(dashboard: DashboardData): MoveOption[] {
  return dashboard.ranked.slice(0, 3).flatMap(ranked => {
    const option = dashboard.engines[ranked.moveType].options.find(item => item.id === ranked.optionId && item.eligible);
    return option ? [option] : [];
  });
}
export function templateRecommendation(option: MoveOption): Recommendation {
  return {
    id: `recommendation:${option.id}`, optionId: option.id, moveType: option.moveType,
    title: option.title, action: `Review ${option.title.toLowerCase()}${option.highStakes ? " with a TFS specialist" : " and its next steps"}.`,
    why: option.summary, impactLabel: option.savingsVsBaseline && option.savingsVsBaseline > 0 ? `Estimated savings $${Math.round(option.savingsVsBaseline).toLocaleString("en-US")}` : "Compare costs and trade-offs",
    urgencyLabel: option.deadline ? `Decide by ${option.deadline}` : undefined,
    status: "proposed", grounded: false,
  };
}
const copySchema = z.strictObject({ recommendations: z.array(z.strictObject({
  optionId: z.string(), title: z.string(), action: z.string(), why: z.string(), impactLabel: z.string(), urgencyLabel: z.string().nullable(),
})) });

async function draftRecommendations(dashboard: DashboardData): Promise<Recommendation[]> {
  const options = topOptions(dashboard);
  const templates = options.map(templateRecommendation);
  const client = getClient();
  if (!client || !options.length) return templates;
  let correction = "";
  let best = templates;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const config = modelConfig();
      const stream = client.beta.messages.stream({
        ...config, system: [...systemPrompt(dashboard), ...(correction ? [{ type: "text" as const, text: correction }] : [])],
        output_config: { ...config.output_config, format: { type: "json_schema", schema: z.toJSONSchema(copySchema) } },
        messages: [{ role: "user", content: `Draft recommendation copy for exactly these options in this order. Keep why to two sentences and every number verbatim from each option. Include specialist assistance for highStakes options. ${JSON.stringify(options)}` }],
      });
      const response = await stream.finalMessage();
      if (response.stop_reason !== "end_turn") return templates;
      const text = response.content.filter(block => block.type === "text").map(block => block.text).join("");
      const parsed = copySchema.parse(JSON.parse(text));
      if (parsed.recommendations.length !== options.length || parsed.recommendations.some((copy, index) => copy.optionId !== options[index].id)) throw new Error("Unexpected recommendation options");
      let failed = false;
      best = options.map((option, index) => {
        const copy = parsed.recommendations[index];
        const checked = checkGrounding([copy.title, copy.action, copy.why, copy.impactLabel, copy.urgencyLabel].filter(Boolean).join(" "), option);
        if (!checked.grounded) { failed = true; return templates[index]; }
        return { ...templates[index], ...copy, urgencyLabel: copy.urgencyLabel ?? undefined, action: option.highStakes && !/specialist/i.test(copy.action) ? `${copy.action} A TFS specialist can help.` : copy.action, grounded: true };
      });
      if (!failed) return best;
      correction = "Your previous draft contained ungrounded numbers. Regenerate using only exact numeric values in each option. Do not calculate or invent any other amount, percentage, or mileage. If unsure, omit numbers.";
    }
  } catch (error) {
    console.warn("[agent/initial] Using engine templates:", error instanceof Error ? error.name : "Unknown error");
  }
  return best;
}
export async function getInitialPanel(id: PersonaId): Promise<AgentPanelState> {
  const state = getState(id);
  if (state.panel) return panelFromState(id);
  if (state.initialPromise) return state.initialPromise;
  const dashboard = getDashboard(id);
  const revision = state.revision;
  const pending = (async () => {
    const recommendations = await draftRecommendations(dashboard);
    // A consent/action change during generation must not resurrect stale copy.
    if (state.revision !== revision || getState(id) !== state) return getInitialPanel(id);
    state.recommendations = recommendations;
    state.panel = panelFromState(id);
    return state.panel;
  })();
  state.initialPromise = pending;
  try { return await pending; } finally { if (state.initialPromise === pending) state.initialPromise = undefined; }
}
export async function warmInitialPanels() {
  if (runtimeStore.warming) return;
  runtimeStore.warming = true;
  await Promise.allSettled((["maya", "garcia", "jordan", "raj"] as const).map(getInitialPanel));
}
