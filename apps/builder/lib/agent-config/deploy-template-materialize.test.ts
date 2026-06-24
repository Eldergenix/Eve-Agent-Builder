import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createDefaultProject, type AgentProjectConfig } from "@/lib/agent-config/defaults";

const testDir = dirname(fileURLToPath(import.meta.url));
const templateRoot = resolve(testDir, "../../../templates/eve-agent-deploy-template");

async function materializeTemplate(config: AgentProjectConfig) {
  const root = await mkdtemp(join(tmpdir(), "eve-template-materialize-"));
  await cp(templateRoot, root, { recursive: true });

  const configUrl =
    "data:application/json," +
    encodeURIComponent(
      JSON.stringify({
        config,
      }),
    );
  const result = spawnSync(process.execPath, ["scripts/materialize-agent.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      EVE_AGENT_CONFIG_URL: configUrl,
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    await rm(root, { recursive: true, force: true });
    throw new Error(
      [
        `Template materialization failed with status ${result.status ?? "unknown"}.`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return {
    root,
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
  };
}

describe("eve deploy template materializer", () => {
  it("materializes before dependency install in hosted template build configs", async () => {
    const vercel = JSON.parse(await readFile(join(templateRoot, "vercel.json"), "utf8")) as {
      installCommand?: string;
      buildCommand?: string;
    };
    const railway = JSON.parse(await readFile(join(templateRoot, "railway.json"), "utf8")) as {
      build?: {
        buildCommand?: string;
      };
    };
    const templatePackage = JSON.parse(
      await readFile(join(templateRoot, "package.json"), "utf8"),
    ) as {
      packageManager?: string;
    };
    const dockerfile = await readFile(join(templateRoot, "Dockerfile"), "utf8");

    expect(templatePackage.packageManager).toBe("pnpm@11.5.2");
    expect(vercel.installCommand).toBe(
      "node scripts/materialize-agent.mjs --optional && pnpm install",
    );
    expect(vercel.buildCommand).toBe("pnpm build");
    expect(railway.build?.buildCommand).toBe(
      "node scripts/materialize-agent.mjs --optional && pnpm install && pnpm build",
    );
    expect(dockerfile).toContain(
      "COPY . .\nRUN node scripts/materialize-agent.mjs --optional\nRUN pnpm install --prod=false\nRUN pnpm build",
    );
  });

  it("materializes Railway agents without Cloudflare-only files or dependencies", async () => {
    const materialized = await materializeTemplate({
      ...createDefaultProject(),
      name: "railway-proof-agent",
      deployMode: "railway",
      observabilityProvider: "langfuse",
      serviceProviders: ["supabase", "upstash"],
    });

    try {
      const envExample = await readFile(join(materialized.root, ".env.example"), "utf8");
      const supabase = await readFile(join(materialized.root, "lib/supabase.ts"), "utf8");
      const upstash = await readFile(join(materialized.root, "lib/upstash.ts"), "utf8");
      const oneClick = await readFile(join(materialized.root, "deploy/one-click.md"), "utf8");
      const packageJson = JSON.parse(
        await readFile(join(materialized.root, "package.json"), "utf8"),
      ) as {
        packageManager?: string;
        dependencies: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      expect(existsSync(join(materialized.root, "wrangler.jsonc"))).toBe(false);
      expect(existsSync(join(materialized.root, "open-next.config.ts"))).toBe(false);
      expect(existsSync(join(materialized.root, ".dev.vars.example"))).toBe(false);
      expect(envExample).toContain(
        "# On Vercel, AI Gateway can use project OIDC. On other hosts, set AI_GATEWAY_API_KEY.",
      );
      expect(envExample).toContain("OPENAI_API_KEY=");
      expect(envExample).toContain("# Langfuse tracing and eval score reporting");
      expect(envExample).toContain("LANGFUSE_SECRET_KEY=");
      expect(envExample).toContain("LANGFUSE_PROMPT_NAME=railway-proof-agent-instructions");
      expect(envExample).toContain("LANGFUSE_PROMPT_LABEL=production");
      expect(envExample).toContain("LANGFUSE_RUN_NAME=railway-proof-agent evals");
      expect(envExample).toContain("NEXT_PUBLIC_SUPABASE_URL=");
      expect(envExample).toContain("UPSTASH_REDIS_REST_URL=");
      expect(envExample).not.toContain("BRAINTRUST_API_KEY=");
      expect(supabase).toContain(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
      expect(upstash).toContain(
        "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      );
      expect(oneClick).toContain("https://railway.com/new");
      expect(packageJson.packageManager).toBe("pnpm@11.5.2");
      expect(packageJson.dependencies["@opennextjs/cloudflare"]).toBeUndefined();
      expect(packageJson.devDependencies?.wrangler).toBeUndefined();
    } finally {
      await materialized.cleanup();
    }
  });

  it("materializes Cloudflare agents with OpenNext files and selected bindings", async () => {
    const materialized = await materializeTemplate({
      ...createDefaultProject(),
      name: "cloudflare-proof-agent",
      deployMode: "cloudflare",
      observabilityProvider: "braintrust",
      serviceProviders: [
        "cloudflare-d1",
        "cloudflare-kv",
        "cloudflare-r2",
        "cloudflare-workers-ai",
      ],
    });

    try {
      const wrangler = JSON.parse(
        await readFile(join(materialized.root, "wrangler.jsonc"), "utf8"),
      ) as {
        d1_databases?: Array<Record<string, string>>;
        kv_namespaces?: Array<Record<string, string>>;
        r2_buckets?: Array<Record<string, string>>;
        ai?: Record<string, string>;
      };
      const openNext = await readFile(join(materialized.root, "open-next.config.ts"), "utf8");
      const devVars = await readFile(join(materialized.root, ".dev.vars.example"), "utf8");
      const oneClick = await readFile(join(materialized.root, "deploy/one-click.md"), "utf8");
      const bindings = await readFile(
        join(materialized.root, "lib/cloudflare-bindings.ts"),
        "utf8",
      );
      const packageJson = JSON.parse(
        await readFile(join(materialized.root, "package.json"), "utf8"),
      ) as {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
      };

      expect(wrangler.d1_databases?.[0]).toEqual({ binding: "EVE_D1" });
      expect(wrangler.kv_namespaces?.[0]).toEqual({ binding: "EVE_KV" });
      expect(wrangler.r2_buckets?.[0]).toEqual({ binding: "EVE_R2" });
      expect(wrangler.ai).toEqual({ binding: "AI" });
      expect(openNext).toContain("defineCloudflareConfig");
      expect(devVars).toContain("AI_GATEWAY_API_KEY=");
      expect(devVars).toContain("BRAINTRUST_API_KEY=");
      expect(devVars).toContain("BRAINTRUST_PARENT=project_name:cloudflare-proof-agent");
      expect(devVars).toContain("BRAINTRUST_PROMPT_NAME=cloudflare-proof-agent-instructions");
      expect(devVars).toContain("BRAINTRUST_PROMPT_SLUG=cloudflare-proof-agent-instructions");
      expect(devVars).toContain("BRAINTRUST_PROMPT_ENV=production");
      expect(oneClick).toContain("D1, KV, and R2 use binding-only declarations");
      expect(bindings).toContain("requireCloudflareBinding");
      expect(bindings).toContain("Cloudflare binding ${binding} is not configured.");
      expect(packageJson.dependencies["@opennextjs/cloudflare"]).toBeDefined();
      expect(packageJson.devDependencies.wrangler).toBeDefined();
    } finally {
      await materialized.cleanup();
    }
  });

  it("materializes Docker agents with a fast compose path", async () => {
    const materialized = await materializeTemplate({
      ...createDefaultProject(),
      name: "docker-proof-agent",
      deployMode: "docker",
      observabilityProvider: "none",
      serviceProviders: ["upstash", "cloudflare-d1"],
    });

    try {
      const oneClick = await readFile(join(materialized.root, "deploy/one-click.md"), "utf8");

      expect(existsSync(join(materialized.root, "lib/cloudflare-bindings.ts"))).toBe(false);
      expect(oneClick).toContain("## Fast path");
      expect(oneClick).toContain("cp .env.example .env.local");
      expect(oneClick).toContain("docker compose up --build");
      expect(oneClick).toContain("UPSTASH_REDIS_REST_URL");
      expect(oneClick).not.toContain("Cloudflare D1");
    } finally {
      await materialized.cleanup();
    }
  });

  it("keeps enabled framework tools available in managed template deployments", async () => {
    const materialized = await materializeTemplate({
      ...createDefaultProject(),
      name: "framework-tools-agent",
      deployMode: "vercel",
    });

    try {
      expect(existsSync(join(materialized.root, "agent/tools/bash.ts"))).toBe(false);
      expect(existsSync(join(materialized.root, "agent/tools/readFile.ts"))).toBe(false);
      expect(existsSync(join(materialized.root, "agent/tools/get_weather.ts"))).toBe(true);
    } finally {
      await materialized.cleanup();
    }
  });

  it("disables only framework tools that users explicitly turn off", async () => {
    const config = createDefaultProject();
    const materialized = await materializeTemplate({
      ...config,
      name: "disabled-framework-tool-agent",
      deployMode: "vercel",
      capabilities: config.capabilities.map((item) =>
        item.kind === "framework-tool" && item.name === "bash" ? { ...item, enabled: false } : item,
      ),
    });

    try {
      const disabledTool = await readFile(join(materialized.root, "agent/tools/bash.ts"), "utf8");

      expect(disabledTool).toContain("disableTool");
      expect(existsSync(join(materialized.root, "agent/tools/readFile.ts"))).toBe(false);
    } finally {
      await materialized.cleanup();
    }
  });
});
