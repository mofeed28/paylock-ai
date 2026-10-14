import { judgeDemo } from "@/lib/workspace";
import { getDashboard, jsonData } from "@/lib/data";
import { Dashboard } from "@/components/dashboard";
export default async function Page() {
  return (
    <Dashboard
      judgeDemo={judgeDemo()}
      agreements={jsonData(await getDashboard())}
    />
  );
}
