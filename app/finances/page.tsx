import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/AppShell";

export const metadata: Metadata = { title: "Finances | Next Move Copilot" };

export default function FinancesPage() {
  return <AppShell page="finances" />;
}
