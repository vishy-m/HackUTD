import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/AppShell";

export const metadata: Metadata = { title: "Driving | Next Move Copilot" };

export default function DrivingPage() {
  return <AppShell page="driving" />;
}
