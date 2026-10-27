import { AppShell } from "@/components/dashboard/AppShell";

// The dashboard is a client app over /api (with mock fallback). The static shell prerenders;
// data loads on the client per persona.
export default function Home() {
  return <AppShell />;
}
