import { AgentStudio } from "@/components/agent-studio";
export default function Page() {
  return <AgentStudio demoWebsiteUrl={process.env.DEMO_WEBSITE_URL || ""} />;
}
