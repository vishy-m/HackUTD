import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentChatRequest, MoveType, WhatIfOverrides } from "../types";
import { agentContext, getDashboard } from "../server/dashboard";
import { getState } from "../server/store";
import { getClient, friendlyError, modelConfig } from "./client";
import { systemPrompt } from "./prompt";
import { checkGrounding } from "./grounding";
import { agentTools, executeTool, overrideMove, type Emit, type ToolContext } from "./tools";
import { templateRecommendation, topOptions } from "./recommendations";

function emitText(text: string, emit: Emit) {
  for (const delta of text.match(/[\s\S]{1,160}(?:\s|$)|[\s\S]{1,160}/g) ?? []) emit({ type: "text", delta });
}
export async function offlineChat(request: AgentChatRequest, context: ToolContext) {
  const dashboard = getDashboard(request.personaId);
  const message = request.message.toLowerCase();
  const overrides: WhatIfOverrides = {};
  const miles = message.match(/([\d,]+(?:\.\d+)?)\s*(?:miles?|mi)\s*(?:a|per|\/|each)?\s*(?:month|mo)\b/);
  const extra = message.match(/(?:extra|additional)\s*\$?([\d,]+(?:\.\d+)?)/);
  if (miles) overrides.monthlyMiles = Number(miles[1].replaceAll(",", ""));
  if (extra) overrides.extraPrincipal = Number(extra[1].replaceAll(",", ""));
  let moveType: MoveType = /insur|score|brak/.test(message) ? "insurance" : /protect|tire|care/.test(message) ? "protection" : /payment|refinanc|payoff|principal/.test(message) ? "payment" : dashboard.ranked[0]?.moveType ?? "lease-end";
  const controls = Object.entries(overrides) as [keyof WhatIfOverrides, number][];
  if (controls.length) moveType = overrideMove(controls[0][0], dashboard.persona.contract.kind === "lease");
  for (const [control, value] of controls) {
    const result = await executeTool("set_whatif", { control, value }, context);
    if (result.isError) { emitText("That what-if value is outside the supported range. Try a smaller value.", context.emit); return; }
  }
  if (/more detail|show.*math/.test(message)) await executeTool("update_preference", { key: "detailLevel", value: "show-math" }, context);
  if (/brief|shorter|less detail/.test(message)) await executeTool("update_preference", { key: "detailLevel", value: "brief" }, context);
  if (/\btable\b/.test(message)) await executeTool("update_preference", { key: "format", value: "table" }, context);
  if (/replay|worst trip|trip.*hurt/.test(message) && dashboard.persona.consent.driving) {
    const trip = [...dashboard.trips].sort((a, b) => a.score - b.score)[0];
    if (trip) await executeTool("open_trip_replay", { tripId: trip.id }, context);
  }
  const toolName = `compute_${moveType.replaceAll("-", "_")}_options`;
  const result = await executeTool(toolName, { overrides }, context);
  await executeTool("open_move", { moveType }, context);
  if (result.isError) { emitText("Your calculated dashboard options are still available. Please try this comparison again.", context.emit); return; }
  const engine = result.value as ReturnType<typeof getDashboard>["engines"][MoveType];
  const baseline = topOptions(dashboard).find(option => option.moveType === moveType);
  const option = engine.options.find(option => option.id === (request.context?.optionId ?? baseline?.id) && option.eligible) ?? engine.options.find(option => option.eligible);
  const text = option ? `${option.title}: ${option.summary}\n${option.highStakes ? "A TFS specialist can help review the trade-offs. " : "Review the assumptions and trade-offs before deciding. "}This is guidance, not financial advice.` : "There are no eligible options for this scenario. A TFS specialist can help review your next steps.";
  emitText(`Live AI is unavailable; here is the calculated template guidance.\n${text}`, context.emit);
  if (/draft|write.*message|comparison/.test(message) && option) await executeTool("create_draft", { type: /message/.test(message) ? "message" : "comparison", title: option.title, content: text, relatedOptionId: option.id }, context);
  context.emit({ type: "recommendations", recommendations: (option ? [option] : topOptions(dashboard)).map(templateRecommendation) });
}

export async function runAgent(request: AgentChatRequest, emit: Emit, signal?: AbortSignal) {
  const dashboard = getDashboard(request.personaId);
  const context: ToolContext = { personaId: request.personaId, emit, evidence: [agentContext(dashboard)] };
  const initialConsent = JSON.stringify(getState(request.personaId).consent);
  const client = getClient();
  try {
    if (!client) { await offlineChat(request, context); return; }
    // Beta message params preserve thinking signatures and any server fallback blocks.
    const firstMessage: Anthropic.MessageParam = { role: "user", content: `${request.message}${request.context ? `\nUI context (data): ${JSON.stringify(request.context)}` : ""}` };
    const messages: BetaMessageParam[] = [firstMessage];
    let correction = "";
    let corrected = false;
    for (let iteration = 0; iteration < 8; iteration++) {
      if (signal?.aborted) return;
      if (JSON.stringify(getState(request.personaId).consent) !== initialConsent) { emit({ type: "error", message: "Your data permissions changed. Please ask again with the updated settings." }); return; }
      const deltas: string[] = [];
      const stream = client.beta.messages.stream({
        ...modelConfig(), system: [...systemPrompt(getDashboard(request.personaId)), ...(correction ? [{ type: "text" as const, text: correction }] : [])],
        tools: agentTools, messages,
      }, { signal });
      // Preserve SDK text deltas, but publish only after grounding/refusal validation.
      stream.on("text", delta => deltas.push(delta));
      const response = await stream.finalMessage();
      if (JSON.stringify(getState(request.personaId).consent) !== initialConsent) { emit({ type: "error", message: "Your data permissions changed. Please ask again with the updated settings." }); return; }
      if (response.stop_reason === "refusal") { emit({ type: "error", message: "I cannot help with that request. I can explain your Toyota options or help prepare questions for a TFS specialist." }); return; }
      if (response.stop_reason === "max_tokens" || response.stop_reason === "model_context_window_exceeded") {
        emit({ type: "error", message: "The response reached its limit. Here are your calculated options." });
        emitText(topOptions(getDashboard(request.personaId)).map(option => option.summary).join("\n"), emit);
        return;
      }
      const content = response.content.filter(block => block.type === "text").map(block => block.text).join("");
      const grounded = checkGrounding(content, context.evidence);
      if (!grounded.grounded) {
        if (!corrected) {
          corrected = true;
          correction = `Regenerate your last response. Unsupported numbers: ${grounded.violations.map(item => item.raw).join(", ")}. Use only exact figures already in tool results or the consented dashboard. Do not call side-effect tools again. Omit numbers if uncertain.`;
          continue;
        }
        const options = topOptions(getDashboard(request.personaId));
        emitText(options.map(option => option.summary).join("\n") + "\nA TFS specialist can help. This is guidance, not financial advice.", emit);
        emit({ type: "recommendations", recommendations: options.map(templateRecommendation) });
        return;
      }
      if (deltas.length) deltas.forEach(delta => emit({ type: "text", delta }));
      else if (content) emitText(content, emit);
      if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") return;
      if (response.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          const tool: Anthropic.ToolUseBlock = { ...block, caller: block.caller ?? { type: "direct" } };
          const result = await executeTool(tool.name, tool.input, context);
          toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: JSON.stringify(result.value), is_error: result.isError });
        }
        if (!toolResults.length) throw new Error("Missing tool calls");
        messages.push({ role: "user", content: toolResults });
      } else if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
      } else {
        emit({ type: "error", message: "The assistant paused unexpectedly. Please try a shorter question." }); return;
      }
    }
    emit({ type: "error", message: "I reached the tool-step limit. Your calculated options are available; try a more specific question." });
  } catch (error) {
    if (signal?.aborted) return;
    console.warn("[agent] Live response failed:", error instanceof Error ? error.name : "Unknown error");
    emit({ type: "error", message: friendlyError(error) });
    await offlineChat(request, context);
  } finally { emit({ type: "done" }); }
}
