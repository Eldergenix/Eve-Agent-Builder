import { describe, expect, it } from "vitest";

import { createDefaultProject } from "@/lib/agent-config/defaults";
import { generateProjectFiles } from "@/lib/agent-config/generate-files";

describe("generateProjectFiles", () => {
  it("emits catalog-backed linear connection when enabled", () => {
    const config = createDefaultProject();
    const files = generateProjectFiles({
      ...config,
      capabilities: config.capabilities.map((item) =>
        item.id === "connection-linear" ? { ...item, enabled: true } : item,
      ),
    });

    expect(files["agent/connections/linear.ts"]).toContain("https://mcp.linear.app/sse");
    expect(files["agent/connections/linear.ts"]).toContain('connect("linear")');
  });

  it("emits disableTool for disabled framework tools", () => {
    const config = createDefaultProject();
    const files = generateProjectFiles(config);
    expect(files["agent/tools/bash.ts"]).toBeUndefined();
  });

  it("uses eval prompt and assertion from config", () => {
    const config = createDefaultProject();
    const files = generateProjectFiles({
      ...config,
      evalPrompt: "Say hello.",
      evalAssertion: "hello",
    });
    expect(files["evals/evals.config.ts"]).toContain("defineEvalConfig({})");
    expect(files["evals/smoke.eval.ts"]).toContain('from "eve/evals"');
    expect(files["evals/smoke.eval.ts"]).toContain('from "eve/evals/expect"');
    expect(files["evals/smoke.eval.ts"]).toContain('"Say hello."');
    expect(files["evals/smoke.eval.ts"]).toContain('"hello"');
  });

  it("emits smoke evals even when no authored tools are enabled", () => {
    const config = createDefaultProject();
    const files = generateProjectFiles({
      ...config,
      capabilities: config.capabilities.map((item) =>
        item.kind === "tool" ? { ...item, enabled: false } : item,
      ),
    });

    expect(files["evals/evals.config.ts"]).toContain("defineEvalConfig");
    expect(files["evals/smoke.eval.ts"]).toContain("defineEval");
  });

  it("emits chat app and omits observability packages by default", () => {
    const files = generateProjectFiles(createDefaultProject());
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      packageManager?: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(files["app/page.tsx"]).toContain('from "eve/react"');
    expect(files["next.config.ts"]).toContain("withEve(nextConfig)");
    expect(files["deploy/one-click.md"]).toContain("Deploy with Vercel");
    expect(files["deploy/manifest.json"]).toContain('"generatedScope": "standalone-agent-app"');
    expect(files[".env.example"]).toContain("AI_GATEWAY_API_KEY=");
    expect(files["agent/instrumentation.ts"]).toBeUndefined();
    expect(files["prompts/instructions.ts"]).toBeUndefined();
    expect(files["scripts/push-prompt.mjs"]).toBeUndefined();
    expect(packageJson.packageManager).toBe("pnpm@11.5.2");
    expect(packageJson.dependencies.ai).toBeDefined();
    expect(packageJson.dependencies.next).toBeDefined();
    expect(packageJson.devDependencies["@typescript/native-preview"]).toBeDefined();
    expect(packageJson.dependencies["@braintrust/otel"]).toBeUndefined();
    expect(packageJson.dependencies["@langfuse/otel"]).toBeUndefined();
    expect(packageJson.scripts["prompt:push"]).toBeUndefined();
    expect(Object.keys(files).some((path) => path.startsWith("components/builder/"))).toBe(false);
  });

  it("emits repository-aware deploy links and manifest", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      repositoryUrl: "https://github.com/acme/agent",
      deployMode: "cloudflare",
      serviceProviders: ["supabase"],
    });
    const manifest = JSON.parse(files["deploy/manifest.json"] ?? "{}") as {
      repositoryUrl?: string;
      oneClickUrls?: { vercel?: string; cloudflare?: string };
      deploymentActions?: {
        cloudflare?: {
          buttonMarkdown?: string;
          environmentVariables?: Array<{ key: string; category: string; secret: boolean }>;
          steps?: string[];
        };
        docker?: { steps?: string[] };
      };
      environmentVariables?: Array<{ key: string; category: string; secret: boolean }>;
      requiredEnvironment?: string[];
      target?: string;
    };

    expect(files["deploy/one-click.md"]).toContain("https%3A%2F%2Fgithub.com%2Facme%2Fagent");
    expect(files["deploy/one-click.md"]).toContain("Repository: https://github.com/acme/agent");
    expect(files["deploy/one-click.md"]).toContain("## Selected target steps");
    expect(files["deploy/one-click.md"]).toContain("## Embed snippets");
    expect(manifest.repositoryUrl).toBe("https://github.com/acme/agent");
    expect(manifest.target).toBe("cloudflare");
    expect(manifest.oneClickUrls?.cloudflare).toContain(
      "url=https%3A%2F%2Fgithub.com%2Facme%2Fagent",
    );
    expect(manifest.oneClickUrls?.vercel).toContain(
      "repository-url=https%3A%2F%2Fgithub.com%2Facme%2Fagent",
    );
    expect(manifest.deploymentActions?.cloudflare?.buttonMarkdown).toContain(
      "Deploy to Cloudflare",
    );
    expect(manifest.deploymentActions?.cloudflare?.steps).toContain(
      "Let Cloudflare clone the standalone agent repository.",
    );
    expect(manifest.environmentVariables).toContainEqual(
      expect.objectContaining({
        key: "SUPABASE_SERVICE_ROLE_KEY",
        category: "database",
        secret: true,
      }),
    );
    expect(manifest.deploymentActions?.cloudflare?.environmentVariables).toContainEqual(
      expect.objectContaining({
        key: "SUPABASE_SERVICE_ROLE_KEY",
      }),
    );
    expect(manifest.requiredEnvironment).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("emits Cloudflare Workers deployment files when selected", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      deployMode: "cloudflare",
    });
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      cloudflare?: { bindings?: Record<string, unknown> };
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(files["wrangler.jsonc"]).toContain('"main": ".open-next/worker.js"');
    expect(files["open-next.config.ts"]).toContain("defineCloudflareConfig");
    expect(files[".dev.vars.example"]).toContain("AI_GATEWAY_API_KEY=");
    expect(files["deploy/one-click.md"]).toContain("https://deploy.workers.cloudflare.com/?url=");
    expect(packageJson.dependencies["@opennextjs/cloudflare"]).toBeDefined();
    expect(packageJson.devDependencies.wrangler).toBeDefined();
    expect(packageJson.scripts.deploy).toBe(
      "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    );
    expect(packageJson.cloudflare?.bindings?.AI_GATEWAY_API_KEY).toBeDefined();
  });

  it("emits Cloudflare resource bindings for selected Cloudflare services", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      deployMode: "cloudflare",
      serviceProviders: [
        "cloudflare-d1",
        "cloudflare-kv",
        "cloudflare-r2",
        "cloudflare-vectorize",
        "cloudflare-queues",
        "cloudflare-hyperdrive",
        "cloudflare-workers-ai",
        "cloudflare-browser",
        "cloudflare-analytics-engine",
        "cloudflare-images",
        "cloudflare-ai-search",
      ],
    });
    const wrangler = JSON.parse(files["wrangler.jsonc"] ?? "{}") as {
      d1_databases?: Array<Record<string, string>>;
      kv_namespaces?: Array<Record<string, string>>;
      r2_buckets?: Array<Record<string, string>>;
      vectorize?: Array<Record<string, string>>;
      hyperdrive?: Array<Record<string, string>>;
      ai?: Record<string, string>;
      browser?: Record<string, string>;
      analytics_engine_datasets?: Array<Record<string, string>>;
      images?: Record<string, string>;
      ai_search_namespaces?: Array<Record<string, string>>;
      queues?: {
        producers?: Array<Record<string, string>>;
        consumers?: Array<Record<string, string>>;
      };
    };
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      cloudflare?: { bindings?: Record<string, unknown> };
    };

    expect(wrangler.d1_databases?.[0]).toEqual({ binding: "EVE_D1" });
    expect(wrangler.kv_namespaces?.[0]).toEqual({ binding: "EVE_KV" });
    expect(wrangler.r2_buckets?.[0]).toEqual({ binding: "EVE_R2" });
    expect(wrangler.vectorize?.[0]).toMatchObject({
      binding: "EVE_VECTORIZE",
      index_name: "my-eve-agent-vectors",
    });
    expect(wrangler.queues?.producers?.[0]).toMatchObject({
      binding: "EVE_QUEUE",
      queue: "my-eve-agent-queue",
    });
    expect(wrangler.hyperdrive?.[0]).toMatchObject({
      binding: "EVE_HYPERDRIVE",
      id: "00000000000000000000000000000000",
    });
    expect(wrangler.ai).toMatchObject({ binding: "AI" });
    expect(wrangler.browser).toMatchObject({ binding: "BROWSER" });
    expect(wrangler.analytics_engine_datasets?.[0]).toMatchObject({
      binding: "EVE_ANALYTICS",
      dataset: "my-eve-agent-analytics",
    });
    expect(wrangler.images).toMatchObject({ binding: "IMAGES" });
    expect(wrangler.ai_search_namespaces?.[0]).toMatchObject({
      binding: "EVE_AI_SEARCH",
      namespace: "default",
    });
    expect(files["lib/cloudflare-bindings.ts"]).toContain("EVE_D1");
    expect(files["lib/cloudflare-bindings.ts"]).toContain("EVE_HYPERDRIVE");
    expect(files["lib/cloudflare-bindings.ts"]).toContain("EVE_AI_SEARCH");
    expect(files["deploy/one-click.md"]).toContain(
      "Cloudflare-native services are declared in `wrangler.jsonc`",
    );
    expect(files["deploy/one-click.md"]).toContain("D1, KV, and R2 use binding-only declarations");
    expect(packageJson.cloudflare?.bindings?.EVE_VECTORIZE).toBeDefined();
    expect(packageJson.cloudflare?.bindings?.EVE_ANALYTICS).toBeDefined();
  });

  it("emits Docker and Railway deployment files", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      deployMode: "docker",
      serviceProviders: ["cloudflare-d1"],
    });
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      scripts: Record<string, string>;
    };

    expect(files.Dockerfile).toContain("FROM node:24-slim");
    expect(files.Dockerfile).toContain("pnpm install --prod=false");
    expect(files["compose.yaml"]).toContain("services:");
    expect(files["deploy/one-click.md"]).toContain("## Fast path");
    expect(files["deploy/one-click.md"]).toContain("cp .env.example .env.local");
    expect(files["deploy/one-click.md"]).toContain("docker compose up --build");
    expect(files["deploy/one-click.md"]).toContain("Run docker compose up --build.");
    expect(files["lib/cloudflare-bindings.ts"]).toBeUndefined();
    expect(files["deploy/one-click.md"]).not.toContain("Cloudflare D1");
    expect(files["railway.json"]).toContain('"startCommand": "pnpm start"');
    expect(packageJson.scripts["docker:build"]).toContain("docker build");
  });

  it("emits selected production service helpers and env keys", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      serviceProviders: ["supabase", "upstash"],
    });
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      dependencies: Record<string, string>;
    };

    expect(files["lib/supabase.ts"]).toContain("createSupabaseServerClient");
    expect(files["lib/upstash.ts"]).toContain("createRedisClient");
    expect(files[".env.example"]).toContain("SUPABASE_SERVICE_ROLE_KEY=");
    expect(files[".env.example"]).toContain("UPSTASH_REDIS_REST_TOKEN=");
    expect(packageJson.dependencies["@supabase/supabase-js"]).toBeDefined();
    expect(packageJson.dependencies["@upstash/redis"]).toBeDefined();
  });

  it("emits Braintrust tracing and eval reporting when selected", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      observabilityProvider: "braintrust",
    });
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(files["agent/instrumentation.ts"]).toContain("BraintrustExporter");
    expect(files["evals/evals.config.ts"]).toContain("Braintrust");
    expect(files[".env.example"]).toContain("BRAINTRUST_API_KEY=");
    expect(files[".env.example"]).toContain("BRAINTRUST_PROMPT_SLUG=my-eve-agent-instructions");
    expect(files["prompts/instructions.ts"]).toContain("braintrust.projects.create");
    expect(files["prompts/instructions.ts"]).toContain("agent/instructions.md");
    expect(packageJson.dependencies["@braintrust/otel"]).toBeDefined();
    expect(packageJson.dependencies.braintrust).toBeDefined();
    expect(packageJson.dependencies["@langfuse/otel"]).toBeUndefined();
    expect(packageJson.scripts["prompt:push"]).toBe("bt functions push prompts/instructions.ts");
  });

  it("emits Langfuse tracing and eval score reporting when selected", () => {
    const files = generateProjectFiles({
      ...createDefaultProject(),
      observabilityProvider: "langfuse",
    });
    const packageJson = JSON.parse(files["package.json"] ?? "{}") as {
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(files["agent/instrumentation.ts"]).toContain("LangfuseSpanProcessor");
    expect(files["evals/evals.config.ts"]).toContain("Langfuse");
    expect(files[".env.example"]).toContain("LANGFUSE_SECRET_KEY=");
    expect(files[".env.example"]).toContain("LANGFUSE_PROMPT_LABEL=production");
    expect(files["scripts/push-prompt.mjs"]).toContain("langfuse.prompt.create");
    expect(files["scripts/push-prompt.mjs"]).toContain("agent/instructions.md");
    expect(packageJson.dependencies["@langfuse/otel"]).toBeDefined();
    expect(packageJson.dependencies["@langfuse/client"]).toBeDefined();
    expect(packageJson.dependencies["@braintrust/otel"]).toBeUndefined();
    expect(packageJson.scripts["prompt:push"]).toBe("node scripts/push-prompt.mjs");
  });

  it("exports skills.sh skill file contents", () => {
    const config = createDefaultProject();
    const files = generateProjectFiles({
      ...config,
      capabilities: [
        ...config.capabilities,
        {
          id: "skill-sh-demo",
          kind: "skill",
          name: "find-skills",
          description: "Find skills",
          enabled: true,
          icon: "bulb",
          skillsShId: "vercel-labs/skills/find-skills",
          skillFiles: {
            "SKILL.md": "---\ndescription: Find skills\n---\n\n# Find skills\n",
          },
        },
      ],
    });

    expect(files["agent/skills/find-skills.md"]).toContain("# Find skills");
  });
});
