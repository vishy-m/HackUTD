import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/AppShell";

export const metadata: Metadata = { title: "Moves | Next Move Copilot" };

export default function MovesPage() {
  return <AppShell page="moves" />;
}
