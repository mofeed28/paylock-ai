import { getDashboard, jsonData } from "@/lib/data";
import { Dashboard } from "@/components/dashboard";
export default async function Page() {
  return <Dashboard agreements={jsonData(await getDashboard())} listing />;
}
