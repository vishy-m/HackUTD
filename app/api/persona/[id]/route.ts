import { getDashboard } from "@/lib/server/dashboard";
import { errorResponse, json } from "@/lib/server/http";
import { personaIdSchema } from "@/lib/server/schemas";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return json(getDashboard(personaIdSchema.parse((await context.params).id))); }
  catch (error) { return errorResponse(error); }
}
