import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const optional = process.argv.includes("--optional");
const configUrl = process.env.EVE_AGENT_CONFIG_URL?.trim();

const PACKAGE_VERSIONS = {
  ai: "7.0.0-beta.178",
  connect: "0.2.2",
  eve: "^0.11.4",
  next: "16.2.6",
  nodeTypes: "25.9.1",
  react: "19.2.6",
  reactDom: "19.2.6",
  reactDomTypes: "19.2.3",
  reactTypes: "19.2.15",
  tsgo: "7.0.0-dev.20260523.1",
  zod: "4.4.3",
};

if (!configUrl) {
  if (optional) {
    console.log("[eve-template] EVE_AGENT_CONFIG_URL not set; using checked-in fallback agent.");
    process.exit(0);
  }
  throw new Error("EVE_AGENT_CONFIG_URL is required to materialize this deployment template.");
}

const response = await fetch(configUrl);
if (!response.ok) {
  throw new Error(
    `Failed to fetch EVE_AGENT_CONFIG_URL: ${response.status} ${response.statusText}`,
  );
}

const payload = await response.json();
const config = normalizeConfig(payload?.config ?? payload);
assertConfig(config);
await materialize(config);
console.log(`[eve-template] Materialized ${config.name}.`);

function normalizeConfig(config) {
  const deployMode = normalizeDeployMode(config?.deployMode);
  return {
    ...config,
    deployMode,
    repositoryUrl: typeof config?.repositoryUrl === "string" ? config.repositoryUrl.trim() : "",
    serviceProviders: normalizeServiceProviders(config?.serviceProviders, deployMode),
  };
}

function normalizeDeployMode(value) {
  return value === "cloudflare" ||
    value === "railway" ||
    value === "docker" ||
    value === "local" ||
    value === "vercel"
    ? value
    : "vercel";
}

function normalizeServiceProviders(value, deployMode) {
  if (!Array.isArray(value)) return [];
  const providers = new Set();
  for (const item of value) {
    if (
      item === "supabase" ||
      item === "upstash" ||
      item === "cloudflare-d1" ||
      item === "cloudflare-kv" ||
      item === "cloudflare-r2" ||
      item === "cloudflare-vectorize" ||
      item === "cloudflare-queues" ||
      item === "cloudflare-hyperdrive" ||
      item === "cloudflare-workers-ai" ||
      item === "cloudflare-browser" ||
      item === "cloudflare-analytics-engine" ||
      item === "cloudflare-images" ||
      item === "cloudflare-ai-search"
    ) {
      if (item.startsWith("cloudflare-") && deployMode !== "cloudflare") continue;
      providers.add(item);
    }
  }
  return [...providers];
}

function assertConfig(config) {
  if (!config || typeof config !== "object") throw new Error("Invalid deployment config.");
  if (typeof config.name !== "string" || !config.name.trim()) {
    throw new Error("Deployment config is missing name.");
  }
  if (typeof config.model !== "string" || !config.model.trim()) {
    throw new Error("Deployment config is missing model.");
  }
  if (typeof config.instructions !== "string") {
    throw new Error("Deployment config is missing instructions.");
  }
}

async function materialize(config) {
  await rm(join(root, "agent"), { recursive: true, force: true });
  await rm(join(root, "evals"), { recursive: true, force: true });
  await rm(join(root, "lib", "supabase.ts"), { force: true });
  await rm(join(root, "lib", "upstash.ts"), { force: true });
  await rm(join(root, "lib", "cloudflare-bindings.ts"), { force: true });
  await rm(join(root, "agent", "instrumentation.ts"), { force: true });
  await rm(join(root, "prompts"), { recursive: true, force: true });
  await rm(join(root, "scripts", "push-prompt.mjs"), { force: true });
  await rm(join(root, "wrangler.jsonc"), { force: true });
  await rm(join(root, "open-next.config.ts"), { force: true });
  await rm(join(root, ".dev.vars.example"), { force: true });
  await rm(join(root, "cloudflare-env.d.ts"), { force: true });

  await write("agent/agent.ts", agentTs(config));
  await write("agent/instructions.md", instructions(config));
  await write("agent/channels/eve.ts", eveChannelTs());
  await write("evals/evals.config.ts", evalConfigTs(config));
  await write("evals/smoke.eval.ts", smokeEvalTs(config));
  await write("deploy/manifest.json", `${JSON.stringify(deploymentManifest(config), null, 2)}\n`);
  await write("deploy/one-click.md", deployGuide(config));
  await write("README.md", readme(config));
  await write("package.json", `${JSON.stringify(packageJson(config), null, 2)}\n`);
  await write(".env.example", envExample(config));

  if (config.deployMode === "cloudflare") {
    await write("wrangler.jsonc", wranglerJsonc(config));
    await write("open-next.config.ts", openNextConfig());
    await write(".dev.vars.example", envExample(config));
  }

  const instrumentation = instrumentationTs(config);
  if (instrumentation) await write("agent/instrumentation.ts", instrumentation);

  for (const [path, content] of Object.entries(promptFiles(config))) {
    await write(path, content);
  }

  for (const [path, content] of Object.entries(serviceFiles(config))) {
    await write(path, content);
  }

  for (const item of config.capabilities ?? []) {
    if (!item) continue;
    const name = safeIdentifier(item.name ?? item.id ?? item.kind ?? "capability");

    if (item.kind === "framework-tool") {
      if (item.enabled === false) await write(`agent/tools/${name}.ts`, disableToolTs());
      continue;
    }

    if (item.enabled === false) continue;

    if (item.kind === "tool") {
      await write(`agent/tools/${name}.ts`, toolTs(item));
    } else if (item.kind === "skill") {
      await writeSkillFiles(name, item);
    } else if (item.kind === "subagent") {
      await write(`agent/subagents/${name}/agent.ts`, subagentTs(item, config.model));
      await write(
        `agent/subagents/${name}/instructions.md`,
        `# ${name}\n\n${item.description ?? ""}\n`,
      );
    } else if (item.kind === "schedule") {
      await write(`agent/schedules/${name}.ts`, scheduleTs(item));
    } else if (item.kind === "hook") {
      await write(`agent/hooks/${name}.ts`, hookTs());
    } else if (item.kind === "connection") {
      await write(`agent/connections/${name}.ts`, connectionTs(item));
    } else if (item.kind === "channel") {
      await write(`agent/channels/${name}.ts`, channelTs(item, config.name));
    }
  }
}

async function write(relativePath, content) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function writeSkillFiles(name, item) {
  const files = item.skillFiles && typeof item.skillFiles === "object" ? item.skillFiles : null;
  if (!files) {
    await write(`agent/skills/${name}.md`, `# ${name}\n\n${item.description ?? ""}\n`);
    return;
  }
  for (const [filePath, content] of Object.entries(files)) {
    const cleanPath = String(filePath).replace(/^\/+/, "").replace(/\.\./g, "");
    const target =
      cleanPath === "SKILL.md" ? `agent/skills/${name}.md` : `agent/skills/${name}/${cleanPath}`;
    await write(target, String(content));
  }
}

function instructions(config) {
  const trimmed = config.instructions.trim();
  if (trimmed) return `${trimmed}\n`;
  return `# Identity\n\nYou are ${config.name}.\n`;
}

function agentTs(config) {
  const lines = [
    `import { defineAgent } from "eve";`,
    ``,
    `export default defineAgent({`,
    `  model: ${JSON.stringify(config.model)},`,
  ];
  if (config.compactionEnabled && config.compactionThreshold !== 0.9) {
    lines.push(`  compaction: { thresholdPercent: ${Number(config.compactionThreshold)} },`);
  }
  if (config.codeMode) lines.push(`  experimental: { codeMode: true },`);
  if (config.outputSchemaEnabled) {
    lines.push(`  outputSchema: { type: "object", properties: { answer: { type: "string" } } },`);
  }
  const deps = String(config.externalDependencies ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (deps.length > 0) lines.push(`  build: { externalDependencies: ${JSON.stringify(deps)} },`);
  lines.push(`});`, ``);
  return lines.join("\n");
}

function toolTs(item) {
  return `import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: ${JSON.stringify(item.description ?? "Generated tool.")},
  inputSchema: z.object({ query: z.string().min(1) }),
  ${item.requiresApproval ? 'needsApproval: "always",' : ""}
  async execute({ query }) {
    return { query, result: "ok" };
  },
});
`;
}

function disableToolTs() {
  return `import { disableTool } from "eve/tools";

export default disableTool();
`;
}

function subagentTs(item, model) {
  return `import { defineAgent } from "eve";

export default defineAgent({
  description: ${JSON.stringify(item.description ?? "")},
  model: ${JSON.stringify(model)},
});
`;
}

function scheduleTs(item) {
  return `import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: ${JSON.stringify(item.cron ?? "0 9 * * 1")},
  markdown: ${JSON.stringify(item.description ?? "Scheduled task.")},
});
`;
}

function hookTs() {
  return `import { defineHook } from "eve/hooks";

export default defineHook({
  events: {
    "session.started": () => {},
    "message.completed": () => {},
  },
});
`;
}

function connectionTs(item) {
  return `import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  description: ${JSON.stringify(item.description ?? "Generated MCP connection.")},
  url: ${JSON.stringify(item.url ?? "https://mcp.example.com/sse")},
});
`;
}

function channelTs(item, projectName) {
  if ((item.slug ?? item.name) === "slack") {
    const connectorUid = `slack/${slug(projectName)}`;
    return `import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(${JSON.stringify(connectorUid)}),
});
`;
  }
  return eveChannelTs();
}

function eveChannelTs() {
  return `import { eveChannel } from "eve/channels";

export default eveChannel();
`;
}

function evalConfigTs(config) {
  if (config.observabilityProvider === "braintrust") {
    return `import { defineEvalConfig } from "eve/evals";
import { Braintrust } from "eve/evals/reporters";

export default defineEvalConfig({
  reporters: [Braintrust({ projectName: process.env.BRAINTRUST_PROJECT ?? ${JSON.stringify(config.name)} })],
});
`;
  }
  if (config.observabilityProvider === "langfuse") {
    return `import { defineEvalConfig } from "eve/evals";
import { Langfuse } from "eve/evals/reporters";

export default defineEvalConfig({
  reporters: [Langfuse({ runName: process.env.LANGFUSE_RUN_NAME ?? ${JSON.stringify(`${config.name} evals`)} })],
});
`;
  }
  return `import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({});
`;
}

function smokeEvalTs(config) {
  return `import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "Smoke check generated by Eve Agent Builder.",
  tags: ["builder", "smoke"],
  metadata: { expected: ${JSON.stringify(config.evalAssertion ?? "ok")} },
  async test(t) {
    await t.send(${JSON.stringify(config.evalPrompt ?? "Reply ok.")});
    t.completed();
    t.check(t.reply, includes(${JSON.stringify(config.evalAssertion ?? "ok")}));
  },
});
`;
}

function instrumentationTs(config) {
  if (config.observabilityProvider === "braintrust") {
    return `import { BraintrustExporter } from "@braintrust/otel";
import { registerOTel } from "@vercel/otel";
import { defineInstrumentation } from "eve/instrumentation";

export default defineInstrumentation({
  setup: ({ agentName }) =>
    registerOTel({
      serviceName: agentName,
      traceExporter: new BraintrustExporter({
        parent: process.env.BRAINTRUST_PARENT ?? \`project_name:\${agentName}\`,
        filterAISpans: true,
      }),
    }),
});
`;
  }
  if (config.observabilityProvider === "langfuse") {
    return `import { LangfuseSpanProcessor } from "@langfuse/otel";
import { registerOTel } from "@vercel/otel";
import { defineInstrumentation } from "eve/instrumentation";

export default defineInstrumentation({
  setup: ({ agentName }) =>
    registerOTel({
      serviceName: agentName,
      spanProcessors: [new LangfuseSpanProcessor()],
    }),
});
`;
  }
  return null;
}

function promptFiles(config) {
  const promptName = `${config.name}-instructions`;
  if (config.observabilityProvider === "braintrust") {
    return {
      "prompts/instructions.ts": `import { readFileSync } from "node:fs";
import * as braintrust from "braintrust";

const projectName = process.env.BRAINTRUST_PROJECT ?? ${JSON.stringify(config.name)};
const promptName = process.env.BRAINTRUST_PROMPT_NAME ?? ${JSON.stringify(promptName)};
const instructions = readFileSync(new URL("../agent/instructions.md", import.meta.url), "utf8");
const project = braintrust.projects.create({ name: projectName });

export const agentInstructions = project.prompts.create({
  name: promptName,
  slug: process.env.BRAINTRUST_PROMPT_SLUG ?? ${JSON.stringify(slug(promptName))},
  environments: [process.env.BRAINTRUST_PROMPT_ENV ?? "production"],
  model: ${JSON.stringify(config.model)},
  messages: [{ role: "system", content: instructions }],
});
`,
    };
  }
  if (config.observabilityProvider === "langfuse") {
    return {
      "scripts/push-prompt.mjs": `import { readFile } from "node:fs/promises";
import { LangfuseClient } from "@langfuse/client";

const promptName = process.env.LANGFUSE_PROMPT_NAME ?? ${JSON.stringify(promptName)};
const instructions = await readFile(new URL("../agent/instructions.md", import.meta.url), "utf8");
const langfuse = new LangfuseClient();

await langfuse.prompt.create({
  name: promptName,
  type: "text",
  prompt: instructions,
  labels: [process.env.LANGFUSE_PROMPT_LABEL ?? "production"],
});

await langfuse.flush();
`,
    };
  }
  return {};
}

function serviceFiles(config) {
  const files = {};
  if (hasService(config, "supabase")) {
    files["lib/supabase.ts"] = `import { createClient } from "@supabase/supabase-js";

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
`;
  }
  if (hasService(config, "upstash")) {
    files["lib/upstash.ts"] = `import { Redis } from "@upstash/redis";

export function createRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  }
  return new Redis({ url, token });
}
`;
  }
  const cloudflare = cloudflareBindings(config);
  if (Object.keys(cloudflare).length > 0) {
    files["lib/cloudflare-bindings.ts"] =
      `export const cloudflareBindings = ${JSON.stringify(cloudflare, null, 2)} as const;

export type CloudflareBindingName = NonNullable<(typeof cloudflareBindings)[keyof typeof cloudflareBindings]>;

export function requireCloudflareBinding<T = unknown>(
  env: Record<string, unknown>,
  binding: CloudflareBindingName,
): T {
  const value = env[binding];
  if (value === undefined || value === null) {
    throw new Error(\`Cloudflare binding \${binding} is not configured.\`);
  }
  return value as T;
}
`;
  }
  return files;
}

function envExample(config) {
  const base = [
    `# Model credentials for ${config.model}`,
    "# On Vercel, AI Gateway can use project OIDC. On other hosts, set AI_GATEWAY_API_KEY.",
    "AI_GATEWAY_API_KEY=",
    "# Optional direct provider keys if you change agent/agent.ts to a direct provider model.",
    "OPENAI_API_KEY=",
    "ANTHROPIC_API_KEY=",
    "GOOGLE_GENERATIVE_AI_API_KEY=",
    "",
  ];

  if (config.observabilityProvider === "braintrust") {
    return `${[
      ...base,
      "# Braintrust tracing and eval reporting",
      "BRAINTRUST_API_KEY=",
      `BRAINTRUST_PARENT=project_name:${config.name}`,
      `BRAINTRUST_PROJECT=${config.name}`,
      `BRAINTRUST_PROMPT_NAME=${promptName(config)}`,
      `BRAINTRUST_PROMPT_SLUG=${promptSlug(config)}`,
      "BRAINTRUST_PROMPT_ENV=production",
      "",
      ...serviceEnvLines(config),
    ].join("\n")}\n`;
  }

  if (config.observabilityProvider === "langfuse") {
    return `${[
      ...base,
      "# Langfuse tracing and eval score reporting",
      "LANGFUSE_SECRET_KEY=",
      "LANGFUSE_PUBLIC_KEY=",
      "LANGFUSE_BASE_URL=https://cloud.langfuse.com",
      `LANGFUSE_PROMPT_NAME=${promptName(config)}`,
      "LANGFUSE_PROMPT_LABEL=production",
      `LANGFUSE_RUN_NAME=${config.name} evals`,
      "",
      ...serviceEnvLines(config),
    ].join("\n")}\n`;
  }

  return `${[...base, ...serviceEnvLines(config)].join("\n")}\n`;
}

function serviceEnvLines(config) {
  const lines = [];

  if (hasService(config, "supabase")) {
    lines.push(
      "# Supabase",
      "NEXT_PUBLIC_SUPABASE_URL=",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
      "SUPABASE_SERVICE_ROLE_KEY=",
      "",
    );
  }
  if (hasService(config, "upstash")) {
    lines.push("# Upstash Redis", "UPSTASH_REDIS_REST_URL=", "UPSTASH_REDIS_REST_TOKEN=", "");
  }
  return lines;
}

function promptName(config) {
  return `${config.name}-instructions`;
}

function promptSlug(config) {
  return slug(promptName(config));
}

function packageJson(config) {
  const pkg = {
    name: slug(config.name),
    private: true,
    type: "module",
    packageManager: "pnpm@11.5.2",
    scripts: packageScripts(config),
    dependencies: packageDependencies(config),
    devDependencies: packageDevDependencies(config),
    overrides: {
      ai: PACKAGE_VERSIONS.ai,
    },
    engines: {
      node: ">=24",
    },
  };

  if (config.deployMode === "cloudflare") {
    pkg.cloudflare = {
      bindings: {
        ...Object.fromEntries(
          requiredEnv(config).map((key) => [key, { description: envDescription(key) }]),
        ),
        ...Object.fromEntries(
          Object.entries(cloudflareBindings(config)).map(([, binding]) => [
            binding,
            {
              description: "Cloudflare resource binding declared in wrangler.jsonc.",
            },
          ]),
        ),
      },
    };
  }

  return pkg;
}

function packageDependencies(config) {
  const dependencies = {
    "@vercel/connect": PACKAGE_VERSIONS.connect,
    ai: PACKAGE_VERSIONS.ai,
    eve: PACKAGE_VERSIONS.eve,
    next: PACKAGE_VERSIONS.next,
    react: PACKAGE_VERSIONS.react,
    "react-dom": PACKAGE_VERSIONS.reactDom,
    zod: PACKAGE_VERSIONS.zod,
    ...observabilityDependencies(config),
  };

  if (config.deployMode === "cloudflare") {
    dependencies["@opennextjs/cloudflare"] = "latest";
  }
  if (hasService(config, "supabase")) {
    dependencies["@supabase/supabase-js"] = "^2.89.0";
  }
  if (hasService(config, "upstash")) {
    dependencies["@upstash/redis"] = "^1.35.8";
  }

  return dependencies;
}

function packageDevDependencies(config) {
  const devDependencies = {
    "@types/node": PACKAGE_VERSIONS.nodeTypes,
    "@types/react": PACKAGE_VERSIONS.reactTypes,
    "@types/react-dom": PACKAGE_VERSIONS.reactDomTypes,
    "@typescript/native-preview": PACKAGE_VERSIONS.tsgo,
  };

  if (config.deployMode === "cloudflare") {
    devDependencies.wrangler = "latest";
  }

  return devDependencies;
}

function packageScripts(config) {
  const scripts = {
    dev: "NODE_OPTIONS=--max-old-space-size=4096 next dev --webpack",
    "dev:agent": "eve dev",
    build: "next build",
    start: "next start",
    eval: "eve eval --strict",
    typecheck: "tsgo --noEmit -p tsconfig.json",
  };

  if (config.deployMode === "cloudflare") {
    scripts.preview = "opennextjs-cloudflare build && opennextjs-cloudflare preview";
    scripts.deploy = "opennextjs-cloudflare build && opennextjs-cloudflare deploy";
    scripts["cf-typegen"] = "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts";
  } else if (config.deployMode === "docker") {
    scripts["docker:build"] = `docker build -t ${slug(config.name)} .`;
    scripts["docker:run"] =
      `docker run --rm -p 3000:3000 --env-file .env.local ${slug(config.name)}`;
  }

  if (config.observabilityProvider === "braintrust") {
    scripts["prompt:push"] = "bt functions push prompts/instructions.ts";
  } else if (config.observabilityProvider === "langfuse") {
    scripts["prompt:push"] = "node scripts/push-prompt.mjs";
  }

  return scripts;
}

function observabilityDependencies(config) {
  if (config.observabilityProvider === "braintrust") {
    return {
      "@braintrust/otel": "^0.2.0",
      "@vercel/otel": "^2.1.2",
      braintrust: "^3.14.0",
    };
  }
  if (config.observabilityProvider === "langfuse") {
    return {
      "@langfuse/client": "^5.3.0",
      "@langfuse/otel": "^5.3.0",
      "@vercel/otel": "^2.1.2",
    };
  }
  return {};
}

function envDescription(key) {
  if (key === "AI_GATEWAY_API_KEY") return "Vercel AI Gateway API key for non-Vercel hosts.";
  if (key.startsWith("BRAINTRUST_")) return "Braintrust credential for tracing and eval reporting.";
  if (key.startsWith("LANGFUSE_")) return "Langfuse credential for tracing and prompt versions.";
  if (key.startsWith("NEXT_PUBLIC_SUPABASE_") || key === "SUPABASE_SERVICE_ROLE_KEY") {
    return "Supabase project credential.";
  }
  if (key.startsWith("UPSTASH_")) return "Upstash Redis REST credential.";
  return "Deployment secret.";
}

function wranglerJsonc(config) {
  const name = slug(config.name);
  const workerConfig = {
    $schema: "./node_modules/wrangler/config-schema.json",
    name,
    main: ".open-next/worker.js",
    compatibility_date: "2026-06-19",
    compatibility_flags: ["nodejs_compat"],
    assets: { directory: ".open-next/assets", binding: "ASSETS" },
    observability: { enabled: true },
  };
  if (hasService(config, "cloudflare-kv")) {
    workerConfig.kv_namespaces = [{ binding: "EVE_KV" }];
  }
  if (hasService(config, "cloudflare-d1")) {
    workerConfig.d1_databases = [{ binding: "EVE_D1" }];
  }
  if (hasService(config, "cloudflare-r2")) {
    workerConfig.r2_buckets = [{ binding: "EVE_R2" }];
  }
  if (hasService(config, "cloudflare-vectorize")) {
    workerConfig.vectorize = [{ binding: "EVE_VECTORIZE", index_name: `${name}-vectors` }];
  }
  if (hasService(config, "cloudflare-queues")) {
    workerConfig.queues = {
      producers: [{ binding: "EVE_QUEUE", queue: `${name}-queue` }],
      consumers: [{ queue: `${name}-queue` }],
    };
  }
  if (hasService(config, "cloudflare-hyperdrive")) {
    workerConfig.hyperdrive = [
      { binding: "EVE_HYPERDRIVE", id: "00000000000000000000000000000000" },
    ];
  }
  if (hasService(config, "cloudflare-workers-ai")) {
    workerConfig.ai = { binding: "AI" };
  }
  if (hasService(config, "cloudflare-browser")) {
    workerConfig.browser = { binding: "BROWSER" };
  }
  if (hasService(config, "cloudflare-analytics-engine")) {
    workerConfig.analytics_engine_datasets = [
      { binding: "EVE_ANALYTICS", dataset: `${name}-analytics` },
    ];
  }
  if (hasService(config, "cloudflare-images")) {
    workerConfig.images = { binding: "IMAGES" };
  }
  if (hasService(config, "cloudflare-ai-search")) {
    workerConfig.ai_search_namespaces = [{ binding: "EVE_AI_SEARCH", namespace: "default" }];
  }
  return `${JSON.stringify(workerConfig, null, 2)}\n`;
}

function openNextConfig() {
  return `import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
`;
}

function deploymentManifest(config) {
  const actions = deploymentActions(config);
  return {
    version: 1,
    appName: config.name,
    target: config.deployMode ?? "vercel",
    repositoryUrl: config.repositoryUrl?.trim?.() || null,
    oneClickUrls: {
      vercel: deploymentUrl(config, "vercel") ?? "",
      cloudflare: deploymentUrl(config, "cloudflare") ?? "",
      railway: deploymentUrl(config, "railway") ?? "",
    },
    deploymentActions: actions,
    requiredEnvironment: requiredEnv(config),
    environmentVariables: environmentVariables(config),
    services: config.serviceProviders ?? [],
    generatedScope: "standalone-agent-template",
  };
}

function deploymentActions(config) {
  return {
    vercel: deploymentAction(config, "vercel"),
    cloudflare: deploymentAction(config, "cloudflare"),
    railway: deploymentAction(config, "railway"),
    docker: deploymentAction(config, "docker"),
    local: deploymentAction(config, "local"),
  };
}

function deploymentAction(config, target) {
  const url = deploymentUrl(config, target);
  const requiredEnvironment = requiredEnv(config);

  if (target === "vercel") {
    return {
      target,
      label: "Deploy with Vercel",
      url,
      buttonMarkdown: url ? `[![Deploy with Vercel](https://vercel.com/button)](${url})` : null,
      buttonHtml: url
        ? `<a href="${url}"><img src="https://vercel.com/button" alt="Deploy with Vercel"/></a>`
        : null,
      requiredEnvironment,
      environmentVariables: environmentVariables(config),
      steps: [
        "Click Deploy with Vercel.",
        "Fill the listed model, observability, database, and cache keys.",
        "Deploy, then open the generated chat frontend.",
      ],
    };
  }

  if (target === "cloudflare") {
    return {
      target,
      label: "Deploy to Cloudflare",
      url,
      buttonMarkdown: url
        ? `[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](${url})`
        : null,
      buttonHtml: url
        ? `<a href="${url}"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare"/></a>`
        : null,
      requiredEnvironment,
      environmentVariables: environmentVariables(config),
      steps: [
        "Click Deploy to Cloudflare.",
        "Confirm generated Worker and resource names.",
        "Fill the listed Worker secrets.",
        "Deploy, then open the generated chat frontend.",
      ],
    };
  }

  if (target === "railway") {
    return {
      target,
      label: "Deploy on Railway",
      url,
      buttonMarkdown: url ? `[Deploy on Railway](${url})` : null,
      buttonHtml: url ? `<a href="${url}">Deploy on Railway</a>` : null,
      requiredEnvironment,
      environmentVariables: environmentVariables(config),
      steps: [
        "Open the Railway deployment flow.",
        "Fill the listed model, observability, database, and cache variables.",
        "Deploy with the generated railway.json configuration.",
        "Open the generated chat frontend.",
      ],
    };
  }

  if (target === "docker") {
    return {
      target,
      label: "Run with Docker",
      url: null,
      buttonMarkdown: null,
      buttonHtml: null,
      requiredEnvironment,
      environmentVariables: environmentVariables(config),
      steps: [
        "Copy .env.example to .env.local and fill the listed keys.",
        "Run docker compose up --build.",
        "Open http://localhost:3000 to use the chat frontend.",
      ],
    };
  }

  return {
    target,
    label: "Run locally",
    url: null,
    buttonMarkdown: null,
    buttonHtml: null,
    requiredEnvironment,
    environmentVariables: environmentVariables(config),
    steps: [
      "Copy .env.example to .env.local and fill the listed keys.",
      "Run pnpm install and pnpm dev.",
      "Open the local chat frontend.",
    ],
  };
}

function deploymentUrl(config, target) {
  const repositoryUrl = config.repositoryUrl?.trim?.();

  if (target === "vercel" && repositoryUrl) {
    const params = new URLSearchParams({
      "repository-url": repositoryUrl,
      "project-name": config.name,
      "repository-name": config.name,
      env: requiredEnv(config).join(","),
    });
    return `https://vercel.com/new/clone?${params.toString()}`;
  }

  if (target === "cloudflare" && repositoryUrl) {
    return `https://deploy.workers.cloudflare.com/?url=${encodeURIComponent(repositoryUrl)}`;
  }

  if (target === "railway") {
    return "https://railway.com/new";
  }

  return null;
}

function fastPathLines(config, action) {
  const target = config.deployMode ?? "vercel";

  if (target === "docker") {
    return [
      "## Fast path",
      "",
      "```sh",
      "cp .env.example .env.local",
      "docker compose up --build",
      "```",
      "",
      "Open http://localhost:3000 after the container starts.",
    ];
  }

  if (target === "local") {
    return [
      "## Fast path",
      "",
      "```sh",
      "cp .env.example .env.local",
      "pnpm install",
      "pnpm dev",
      "```",
      "",
      "Open the local URL printed by Next.js after the dev server starts.",
    ];
  }

  if (action.buttonMarkdown) {
    return [
      "## Fast path",
      "",
      action.buttonMarkdown,
      "",
      "Add the required keys in the platform prompt, deploy, then open the generated chat frontend.",
    ];
  }

  if (action.url) {
    return [
      "## Fast path",
      "",
      `Open ${action.url}`,
      "",
      "Add the required keys in the platform prompt, deploy, then open the generated chat frontend.",
    ];
  }

  return [];
}

function environmentVariables(config) {
  return requiredEnv(config).map(environmentVariable);
}

function environmentVariable(key) {
  if (key === "EVE_AGENT_CONFIG_URL") {
    return {
      key,
      category: "template",
      description: "Generated agent configuration URL from the hosted builder.",
      secret: false,
    };
  }
  if (key === "AI_GATEWAY_API_KEY") {
    return {
      key,
      category: "model",
      description: "Model gateway key used by the deployed agent runtime.",
      secret: true,
    };
  }
  if (key.startsWith("BRAINTRUST_")) {
    return {
      key,
      category: "observability",
      description: "Braintrust credential for traces, evals, or prompt management.",
      secret: key.endsWith("_API_KEY"),
    };
  }
  if (key.startsWith("LANGFUSE_")) {
    return {
      key,
      category: "observability",
      description: "Langfuse credential for traces, evals, or prompt management.",
      secret: key.includes("SECRET"),
    };
  }
  if (key.startsWith("NEXT_PUBLIC_SUPABASE_") || key === "SUPABASE_SERVICE_ROLE_KEY") {
    return {
      key,
      category: "database",
      description: "Supabase project credential for the generated agent app.",
      secret: key === "SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  if (key.startsWith("UPSTASH_")) {
    return {
      key,
      category: "cache",
      description: "Upstash Redis REST credential for the generated agent app.",
      secret: true,
    };
  }
  return {
    key,
    category: "model",
    description: "Deployment environment variable.",
    secret: true,
  };
}

function serviceLabel(provider) {
  const labels = {
    supabase: "Supabase",
    upstash: "Upstash Redis",
    "cloudflare-d1": "Cloudflare D1",
    "cloudflare-kv": "Cloudflare KV",
    "cloudflare-r2": "Cloudflare R2",
    "cloudflare-vectorize": "Cloudflare Vectorize",
    "cloudflare-queues": "Cloudflare Queues",
    "cloudflare-hyperdrive": "Cloudflare Hyperdrive",
    "cloudflare-workers-ai": "Cloudflare Workers AI",
    "cloudflare-browser": "Cloudflare Browser Rendering",
    "cloudflare-analytics-engine": "Cloudflare Analytics Engine",
    "cloudflare-images": "Cloudflare Images",
    "cloudflare-ai-search": "Cloudflare AI Search",
  };

  return labels[provider] ?? provider;
}

function deployGuide(config) {
  const target = config.deployMode ?? "vercel";
  const manifest = deploymentManifest(config);
  const action = deploymentAction(config, target);
  const repositoryUrl = config.repositoryUrl?.trim?.();
  const oneClickButtons = [
    manifest.deploymentActions.vercel.buttonMarkdown,
    manifest.deploymentActions.cloudflare.buttonMarkdown,
    manifest.deploymentActions.railway.buttonMarkdown,
  ].filter(Boolean);
  const serviceLines =
    (config.serviceProviders ?? []).length > 0
      ? [
          "",
          "## Services",
          "",
          ...(config.serviceProviders ?? []).map((provider) => `- ${serviceLabel(provider)}`),
          ...(hasService(config, "cloudflare-d1") ||
          hasService(config, "cloudflare-kv") ||
          hasService(config, "cloudflare-r2")
            ? [
                "",
                "D1, KV, and R2 use binding-only declarations so Cloudflare can provision those resources during deploy.",
              ]
            : []),
        ]
      : [];
  const sourceLines = repositoryUrl
    ? [`Repository: ${repositoryUrl}`]
    : [
        "This materialized template has already fetched the generated agent config.",
        "Publish this folder to a public GitHub or GitLab repository before reusing hosted deploy buttons.",
      ];

  return [
    "# One-click deployment",
    "",
    `Primary target: ${target}`,
    "",
    ...sourceLines,
    "",
    ...fastPathLines(config, action),
    "",
    "## Selected target steps",
    "",
    ...action.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## One-click buttons",
    "",
    ...(oneClickButtons.length > 0
      ? oneClickButtons
      : ["No hosted deploy button is available for this target."]),
    "",
    "## Required environment keys",
    "",
    ...manifest.environmentVariables.map(
      (variable) =>
        `- \`${variable.key}\` (${variable.category}, ${variable.secret ? "secret" : "plain"}): ${variable.description}`,
    ),
    "",
    "## Docker",
    "",
    "```sh",
    "docker compose up --build",
    "```",
    ...serviceLines,
    "",
  ].join("\n");
}

function readme(config) {
  const target = config.deployMode ?? "vercel";
  const action = deploymentAction(config, target);
  const platformShortcut =
    target === "cloudflare"
      ? "For Cloudflare Workers, use `pnpm run deploy` after adding secrets in Cloudflare Workers Builds or Wrangler."
      : target === "docker"
        ? "For Docker, use `docker compose up --build`."
        : target === "railway"
          ? "For Railway, import the repository and keep the generated `railway.json` build and start commands."
          : target === "local"
            ? "For local hosting, run `pnpm build && pnpm start` behind your own process manager."
            : "For Vercel, import the repository from `https://vercel.com/new` or use the generated Deploy Button.";
  return `# ${config.name}

Materialized by the eve deployment template.

This project contains only the standalone agent runtime, chat frontend, and deployment files. It does not include the hosted agent builder source.

## Run

\`\`\`sh
pnpm install
cp .env.example .env.local
pnpm dev
\`\`\`

## Deploy

One-click deploy links and platform-specific notes live in \`deploy/one-click.md\`.

${action.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Required environment

${environmentVariables(config)
  .map(
    (variable) =>
      `- \`${variable.key}\` (${variable.category}, ${variable.secret ? "secret" : "plain"}): ${variable.description}`,
  )
  .join("\n")}

## Platform shortcuts

- Vercel: import this repository from \`https://vercel.com/new\` or use the generated Deploy Button.
- Cloudflare: run \`pnpm run deploy\` after setting secrets.
- Railway: import this repository and keep the generated \`railway.json\` build and start commands.
- Docker: run \`docker compose up --build\`.

${platformShortcut}
`;
}

function cloudflareBindings(config) {
  const bindings = {};
  if (hasService(config, "cloudflare-d1")) bindings["cloudflare-d1"] = "EVE_D1";
  if (hasService(config, "cloudflare-kv")) bindings["cloudflare-kv"] = "EVE_KV";
  if (hasService(config, "cloudflare-r2")) bindings["cloudflare-r2"] = "EVE_R2";
  if (hasService(config, "cloudflare-vectorize"))
    bindings["cloudflare-vectorize"] = "EVE_VECTORIZE";
  if (hasService(config, "cloudflare-queues")) bindings["cloudflare-queues"] = "EVE_QUEUE";
  if (hasService(config, "cloudflare-hyperdrive"))
    bindings["cloudflare-hyperdrive"] = "EVE_HYPERDRIVE";
  if (hasService(config, "cloudflare-workers-ai")) bindings["cloudflare-workers-ai"] = "AI";
  if (hasService(config, "cloudflare-browser")) bindings["cloudflare-browser"] = "BROWSER";
  if (hasService(config, "cloudflare-analytics-engine"))
    bindings["cloudflare-analytics-engine"] = "EVE_ANALYTICS";
  if (hasService(config, "cloudflare-images")) bindings["cloudflare-images"] = "IMAGES";
  if (hasService(config, "cloudflare-ai-search"))
    bindings["cloudflare-ai-search"] = "EVE_AI_SEARCH";
  return bindings;
}

function requiredEnv(config) {
  const keys = ["AI_GATEWAY_API_KEY"];
  if (config.observabilityProvider === "braintrust") keys.push("BRAINTRUST_API_KEY");
  if (config.observabilityProvider === "langfuse") {
    keys.push("LANGFUSE_SECRET_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_BASE_URL");
  }
  if (hasService(config, "supabase")) {
    keys.push(
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  if (hasService(config, "upstash"))
    keys.push("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN");
  return keys;
}

function hasService(config, service) {
  return Array.isArray(config.serviceProviders) && config.serviceProviders.includes(service);
}

function safeIdentifier(value) {
  const normalized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_/-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "generated";
}

function slug(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "eve-agent"
  );
}
