import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/AppShell";

export const metadata: Metadata = { title: "Repair or Replace | Next Move Copilot" };

export default function RepairPage() {
  return <AppShell page="repair" />;
}
