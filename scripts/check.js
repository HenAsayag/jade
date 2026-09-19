import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
for (const file of readdirSync("js").filter((f) => f.endsWith(".js")))
  execFileSync(process.execPath, ["--check", `js/${file}`]);
console.log("JavaScript syntax checks passed.");
