import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

if (process.env.CI || process.env.VERCEL) {
  process.exit(0);
}

const require = createRequire(import.meta.url);
const simpleGitHooksBin = require.resolve("simple-git-hooks/cli.js");

execFileSync(process.execPath, [simpleGitHooksBin], { stdio: "inherit" });
