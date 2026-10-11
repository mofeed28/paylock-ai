import { existsSync, mkdirSync, closeSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
// Prisma 6 on Windows can fail to bootstrap a missing SQLite file. Creating an
// empty file is safe; append mode never overwrites an existing database.
if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DATABASE_URL || "file:./dev.db";
if (!url.startsWith("file:"))
  throw new Error("This local MVP expects a SQLite file: DATABASE_URL.");
const target = resolve("prisma", url.slice(5).split("?")[0]);
mkdirSync(dirname(target), { recursive: true });
closeSync(openSync(target, "a"));
