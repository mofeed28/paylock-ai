import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";

// Load configuration without forwarding --env-file through process.execArgv.
// Next's build workers convert execArgv to NODE_OPTIONS, where that flag fails.
const [file, ...args] = process.argv.slice(2);
if (!file || !args.length) {
  console.error("Usage: node scripts/with-env.mjs ENV_FILE NODE_SCRIPT [ARGS...]");
  process.exit(1);
}
loadEnvFile(file);
const result = spawnSync(process.execPath, args, {
  env: process.env,
  stdio: "inherit",
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
