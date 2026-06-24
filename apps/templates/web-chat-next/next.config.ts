import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import { withEve } from "eve/next";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
};

export default withEve(nextConfig);
