import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { AgentChatRequest, MoveType, WhatIfOverrides } from "../types";
import { getTrip } from "../data";
import { agentContext, getDashboard } from "../server/dashboard";
import { getState } from "../server/store";
import { getClient, friendlyError, modelConfig } from "./client";
import { systemPrompt } from "./prompt";
import { checkGrounding } from "./grounding";
import { agentTools, executeTool, type Emit, type ToolContext } from "./tools";
import { templateRecommendation, topOptions } from "./recommendations";
import { offlineIntent } from "./offline-intents";

function emitText(text: string, emit: Emit) {
  for (const delta of text.match(/[\s\S]{1,160}(?:\s|$)|[\s\S]{1,160}/g) ?? []) emit({ type: "text", delta });
}
export async function offlineChat(request: AgentChatRequest, context: ToolContext) {
  const dashboard = getDashboard(request.personaId);
  const message = request.message.toLowerCase();
  const { overrides, moveType, replay } = offlineIntent(request.message, dashboard);
  const controls = Object.entries(overrides) as [keyof WhatIfOverrides, number][];
  for (const [control, value] of controls) {
    const result = await executeTool("set_whatif", { control, value }, context);
    if (result.isError) { emitText("That what-if value is outside the supported range. Try a smaller value.", context.emit); return; }
  }
  if (/more detail|show.*math/.test(message)) await executeTool("update_preference", { key: "detailLevel", value: "show-math" }, context);
  if (/brief|shorter|less detail/.test(message)) await executeTool("update_preference", { key: "detailLevel", value: "brief" }, context);
  if (/\btable\b/.test(message)) await executeTool("update_preference", { key: "format", value: "table" }, context);
  if (replay) {
    if (!dashboard.persona.consent.driving) {
      emitText("Enable driving consent to review your recorded trips.", context.emit);
      return;
    }
    const trip = dashboard.trips.filter(trip => trip.showcase).sort((a, b) => a.score - b.score)
      .map(trip => getTrip(trip.id)).find(trip => trip && trip.path.length > 1);
    if (!trip) {
      emitText("There is no recorded showcase trip available to replay.", context.emit);
      return;
    }
    const event = [...trip.events].filter(event => event.scoreDelta < 0).sort((a, b) => a.scoreDelta - b.scoreDelta || a.t - b.t)[0];
    const result = await executeTool("open_trip_replay", { tripId: trip.id, ...(event ? { focusEventT: event.t } : {}) }, context);
    if (result.isError) { emitText("This replay is unavailable. Please try again.", context.emit); return; }
    context.evidence.push(trip);
    emitText(`Opening your lowest-scoring showcase trip to ${trip.destinationLabel} (score ${trip.score}).${event ? ` The replay focuses on its largest recorded score drop: ${event.type.replaceAll("-", " ")}.` : " This trip has no recorded event to focus on."}`, context.emit);
    return;
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
