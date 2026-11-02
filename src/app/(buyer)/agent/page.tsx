import { AgentStudio } from "@/components/agent-studio";
import { accountsEnabled } from "@/lib/workspace";
export default function Page() {
  return (
    <AgentStudio
      demoWebsiteUrl={process.env.DEMO_WEBSITE_URL || ""}
      accounts={accountsEnabled()}
    />
  );
}
