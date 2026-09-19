import { cpSync, mkdirSync } from "node:fs";
mkdirSync("dist", { recursive: true });
for (const item of ["index.html", "css", "js", "assets", "vendor"])
  cpSync(item, `dist/${item}`, { recursive: true });
console.log("Static site ready in dist/");
