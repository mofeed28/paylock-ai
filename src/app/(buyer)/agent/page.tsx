import { AgentStudio } from "@/components/agent-studio";
import { accountsEnabled } from "@/lib/workspace";
import { connectedDemoSeller } from "@/lib/auth";
export default async function Page() {
  return (
    <AgentStudio
      demoWebsiteUrl={process.env.DEMO_WEBSITE_URL || ""}
      accounts={accountsEnabled()}
      demoSeller={await connectedDemoSeller()}
    />
  );
}
