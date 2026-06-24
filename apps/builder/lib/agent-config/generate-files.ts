import { channelFileForSlug, connectionFileForSlug } from "@/lib/agent-config/catalog-templates";
import {
  deploymentManifest,
  requiredEnvironmentKeys,
  resolveDeploymentSource,
} from "@/lib/agent-config/deployment";
import { normalizeAgentProjectConfig } from "@/lib/agent-config/defaults";
import type {
  AgentProjectConfig,
  DeploymentTarget,
  ObservabilityProvider,
  ProductionServiceProvider,
} from "@/lib/agent-config/defaults";
import { exportSkillFiles } from "@/lib/agent-config/export-skills";
import { resolveInstructionsForExport } from "@/lib/agent-config/instructions-name";
import type { CapabilityItem } from "@/types";

function enabled(items: CapabilityItem[], kind: CapabilityItem["kind"]): CapabilityItem[] {
  return items.filter((item) => item.kind === kind && item.enabled);
}

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
  streamdown: "2.5.0",
  tsgo: "7.0.0-dev.20260523.1",
  zod: "4.4.3",
} as const;

const TARGET_LABELS: Record<DeploymentTarget, string> = {
  cloudflare: "Cloudflare Workers",
  docker: "Docker",
  local: "Local",
  railway: "Railway",
  vercel: "Vercel",
};

const SERVICE_LABELS: Record<ProductionServiceProvider, string> = {
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

const CLOUDFLARE_BINDINGS: Partial<Record<ProductionServiceProvider, string>> = {
  "cloudflare-d1": "EVE_D1",
  "cloudflare-kv": "EVE_KV",
  "cloudflare-r2": "EVE_R2",
  "cloudflare-vectorize": "EVE_VECTORIZE",
  "cloudflare-queues": "EVE_QUEUE",
  "cloudflare-hyperdrive": "EVE_HYPERDRIVE",
  "cloudflare-workers-ai": "AI",
  "cloudflare-browser": "BROWSER",
  "cloudflare-analytics-engine": "EVE_ANALYTICS",
  "cloudflare-images": "IMAGES",
  "cloudflare-ai-search": "EVE_AI_SEARCH",
};

function toolTemplate(name: string, description: string, approval: boolean): string {
  return `import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: ${JSON.stringify(description)},
  inputSchema: z.object({ query: z.string().min(1) }),
  ${approval ? 'needsApproval: "always",' : ""}
  async execute({ query }) {
    return { query, result: "ok" };
  },
});
`;
}

function subagentTemplate(description: string, model: string): string {
  return `import { defineAgent } from "eve";

export default defineAgent({
  description: ${JSON.stringify(description)},
  model: ${JSON.stringify(model)},
});
`;
}

function scheduleTemplate(name: string, cron: string, markdown: string): string {
  return `import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: ${JSON.stringify(cron)},
  markdown: ${JSON.stringify(markdown)},
});
`;
}

function hookTemplate(): string {
  return `import { defineHook } from "eve/hooks";

export default defineHook({
  events: {
    "session.started": () => {},
    "message.completed": () => {},
  },
});
`;
}

function observabilityDependencies(provider: ObservabilityProvider): Record<string, string> {
  if (provider === "braintrust") {
    return {
      "@braintrust/otel": "^0.2.0",
      "@vercel/otel": "^2.1.2",
      braintrust: "^3.14.0",
    };
  }

  if (provider === "langfuse") {
    return {
      "@langfuse/client": "^5.3.0",
      "@langfuse/otel": "^5.3.0",
      "@vercel/otel": "^2.1.2",
    };
  }

  return {};
}

function packageDependencies(config: AgentProjectConfig): Record<string, string> {
  const dependencies: Record<string, string> = {
    "@vercel/connect": PACKAGE_VERSIONS.connect,
    ai: PACKAGE_VERSIONS.ai,
    eve: PACKAGE_VERSIONS.eve,
    next: PACKAGE_VERSIONS.next,
    react: PACKAGE_VERSIONS.react,
    "react-dom": PACKAGE_VERSIONS.reactDom,
    zod: PACKAGE_VERSIONS.zod,
    ...observabilityDependencies(config.observabilityProvider),
  };

  if (config.deployMode === "cloudflare") {
    dependencies["@opennextjs/cloudflare"] = "latest";
  }

  if (config.serviceProviders.includes("supabase")) {
    dependencies["@supabase/supabase-js"] = "^2.89.0";
  }

  if (config.serviceProviders.includes("upstash")) {
    dependencies["@upstash/redis"] = "^1.35.8";
  }

  return dependencies;
}

function packageDevDependencies(config: AgentProjectConfig): Record<string, string> {
  const devDependencies: Record<string, string> = {
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

function packageScripts(config: AgentProjectConfig): Record<string, string> {
  const scripts: Record<string, string> = {
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
    scripts["docker:build"] = `docker build -t ${config.name} .`;
    scripts["docker:run"] = `docker run --rm -p 3000:3000 --env-file .env.local ${config.name}`;
  }

  if (config.observabilityProvider === "braintrust") {
    scripts["prompt:push"] = "bt functions push prompts/instructions.ts";
  } else if (config.observabilityProvider === "langfuse") {
    scripts["prompt:push"] = "node scripts/push-prompt.mjs";
  }

  return scripts;
}

function promptName(config: AgentProjectConfig): string {
  return `${config.name}-instructions`;
}

function promptSlug(config: AgentProjectConfig): string {
  return promptName(config)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resourceSlug(config: AgentProjectConfig): string {
  return (
    config.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "eve-agent"
  );
}

function enabledCloudflareProviders(config: AgentProjectConfig): ProductionServiceProvider[] {
  return config.serviceProviders.filter((provider) => provider.startsWith("cloudflare-"));
}

function hasCloudflareProvider(
  config: AgentProjectConfig,
  provider: ProductionServiceProvider,
): boolean {
  return config.serviceProviders.includes(provider);
}

function agentTs(config: AgentProjectConfig): string {
  const lines = [
    `import { defineAgent } from "eve";`,
    ``,
    `export default defineAgent({`,
    `  model: ${JSON.stringify(config.model)},`,
  ];

  if (config.compactionEnabled && config.compactionThreshold !== 0.9) {
    lines.push(`  compaction: { thresholdPercent: ${config.compactionThreshold} },`);
  }

  if (config.codeMode) {
    lines.push(`  experimental: { codeMode: true },`);
  }

  if (config.outputSchemaEnabled) {
    lines.push(`  outputSchema: { type: "object", properties: { answer: { type: "string" } } },`);
  }

  const deps = config.externalDependencies
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (deps.length > 0) {
    lines.push(`  build: { externalDependencies: ${JSON.stringify(deps)} },`);
  }

  lines.push(`});`);
  return lines.join("\n");
}

function instrumentationTemplate(config: AgentProjectConfig): string | undefined {
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
  events: {
    "step.started": ({ session, turn, step }) => ({
      runtimeContext: {
        "builder.observability.provider": "braintrust",
        "builder.prompt.name": process.env.BRAINTRUST_PROMPT_NAME ?? ${JSON.stringify(promptName(config))},
        "builder.prompt.slug": process.env.BRAINTRUST_PROMPT_SLUG ?? ${JSON.stringify(promptSlug(config))},
        "builder.prompt.source": "agent/instructions.md",
        "builder.session.id": session.id,
        "builder.turn.id": turn.id,
        "builder.step.index": step.index,
      },
    }),
  },
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
  events: {
    "step.started": ({ session, turn, step }) => ({
      runtimeContext: {
        "builder.observability.provider": "langfuse",
        "builder.prompt.name": process.env.LANGFUSE_PROMPT_NAME ?? ${JSON.stringify(promptName(config))},
        "builder.prompt.source": "agent/instructions.md",
        "builder.prompt.label": process.env.LANGFUSE_PROMPT_LABEL ?? "production",
        "builder.session.id": session.id,
        "builder.turn.id": turn.id,
        "builder.step.index": step.index,
      },
    }),
  },
});
`;
  }

  return undefined;
}

function evalConfigTemplate(config: AgentProjectConfig): string {
  if (config.observabilityProvider === "braintrust") {
    return `import { defineEvalConfig } from "eve/evals";
import { Braintrust } from "eve/evals/reporters";

export default defineEvalConfig({
  reporters: [
    Braintrust({
      projectName: process.env.BRAINTRUST_PROJECT ?? ${JSON.stringify(config.name)},
    }),
  ],
});
`;
  }

  if (config.observabilityProvider === "langfuse") {
    return `import { defineEvalConfig } from "eve/evals";
import { Langfuse } from "eve/evals/reporters";

export default defineEvalConfig({
  reporters: [
    Langfuse({
      runName: process.env.LANGFUSE_RUN_NAME ?? ${JSON.stringify(`${config.name} evals`)},
    }),
  ],
});
`;
  }

  return `import { defineEvalConfig } from "eve/evals";

export default defineEvalConfig({});
`;
}

function smokeEvalTemplate(config: AgentProjectConfig): string {
  return `import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "Smoke check generated by Eve Agent Builder.",
  tags: ["builder", "smoke"],
  metadata: {
    expected: ${JSON.stringify(config.evalAssertion)},
  },
  async test(t) {
    await t.send(${JSON.stringify(config.evalPrompt)});
    t.completed();
    t.check(t.reply, includes(${JSON.stringify(config.evalAssertion)}));
  },
});
`;
}

function promptManagementTemplate(config: AgentProjectConfig): Record<string, string> {
  if (config.observabilityProvider === "braintrust") {
    return {
      "prompts/instructions.ts": `import { readFileSync } from "node:fs";
import * as braintrust from "braintrust";

const projectName = process.env.BRAINTRUST_PROJECT ?? ${JSON.stringify(config.name)};
const promptName = process.env.BRAINTRUST_PROMPT_NAME ?? ${JSON.stringify(promptName(config))};
const promptSlug = process.env.BRAINTRUST_PROMPT_SLUG ?? ${JSON.stringify(promptSlug(config))};
const promptEnvironment = process.env.BRAINTRUST_PROMPT_ENV ?? "production";
const instructions = readFileSync(new URL("../agent/instructions.md", import.meta.url), "utf8");

const project = braintrust.projects.create({ name: projectName });

export const agentInstructions = project.prompts.create({
  name: promptName,
  slug: promptSlug,
  description: "System instructions generated by Eve Agent Builder.",
  environments: [promptEnvironment],
  model: ${JSON.stringify(config.model)},
  messages: [{ role: "system", content: instructions }],
  metadata: {
    generator: "eve-agent-builder",
    source: "agent/instructions.md",
  },
});
`,
    };
  }

  if (config.observabilityProvider === "langfuse") {
    return {
      "scripts/push-prompt.mjs": `import { readFile } from "node:fs/promises";
import { LangfuseClient } from "@langfuse/client";

const promptName = process.env.LANGFUSE_PROMPT_NAME ?? ${JSON.stringify(promptName(config))};
const promptLabel = process.env.LANGFUSE_PROMPT_LABEL ?? "production";
const instructions = await readFile(new URL("../agent/instructions.md", import.meta.url), "utf8");
const langfuse = new LangfuseClient();

await langfuse.prompt.create({
  name: promptName,
  type: "text",
  prompt: instructions,
  labels: [promptLabel],
});

await langfuse.flush();
console.log(\`Synced Langfuse prompt \${promptName} with label \${promptLabel}.\`);
`,
    };
  }

  return {};
}

function serviceEnvLines(config: AgentProjectConfig): string[] {
  const lines: string[] = [];

  if (config.serviceProviders.includes("supabase")) {
    lines.push(
      "# Supabase",
      "NEXT_PUBLIC_SUPABASE_URL=",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=",
      "SUPABASE_SERVICE_ROLE_KEY=",
      "",
    );
  }

  if (config.serviceProviders.includes("upstash")) {
    lines.push("# Upstash Redis", "UPSTASH_REDIS_REST_URL=", "UPSTASH_REDIS_REST_TOKEN=", "");
  }

  return lines;
}

function envExample(config: AgentProjectConfig): string {
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
    return [
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
    ].join("\n");
  }

  if (config.observabilityProvider === "langfuse") {
    return [
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
    ].join("\n");
  }

  return [...base, ...serviceEnvLines(config)].join("\n");
}

function packageJson(config: AgentProjectConfig): Record<string, unknown> {
  const pkg: Record<string, unknown> = {
    name: config.name,
    private: true,
    type: "module",
    packageManager: "pnpm@11.5.2",
    imports: {
      "#*": "./agent/*",
      "#evals/*": "./evals/*",
    },
    scripts: packageScripts(config),
    dependencies: packageDependencies(config),
    devDependencies: packageDevDependencies(config),
    overrides: {
      ai: PACKAGE_VERSIONS.ai,
    },
    resolutions: {
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
          requiredEnvironmentKeys(config).map((key) => [
            key,
            {
              description: envDescription(key),
            },
          ]),
        ),
        ...Object.fromEntries(
          enabledCloudflareProviders(config).map((provider) => [
            CLOUDFLARE_BINDINGS[provider],
            {
              description: `${SERVICE_LABELS[provider]} binding declared in wrangler.jsonc.`,
            },
          ]),
        ),
      },
    };
  }

  return pkg;
}

function envDescription(key: string): string {
  if (key === "AI_GATEWAY_API_KEY") return "Vercel AI Gateway API key for non-Vercel hosts.";
  if (key.startsWith("BRAINTRUST_")) return "Braintrust credential for tracing and eval reporting.";
  if (key.startsWith("LANGFUSE_")) return "Langfuse credential for tracing and prompt versions.";
  if (key.startsWith("NEXT_PUBLIC_SUPABASE_") || key === "SUPABASE_SERVICE_ROLE_KEY") {
    return "Supabase project credential.";
  }
  if (key.startsWith("UPSTASH_")) return "Upstash Redis REST credential.";
  return "Deployment secret.";
}

function nextConfig(): string {
  return `import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {};

export default withEve(nextConfig);
`;
}

function nextEnvDts(): string {
  return `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited.
`;
}

function layoutTsx(config: AgentProjectConfig): string {
  return `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(config.name)},
  description: ${JSON.stringify(config.description)},
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}

function pageTsx(config: AgentProjectConfig): string {
  return `"use client";

import { type FormEvent, useRef } from "react";
import { useEveAgent } from "eve/react";

type EvePart = ReturnType<typeof useEveAgent>["data"]["messages"][number]["parts"][number];

const AGENT_NAME = ${JSON.stringify(config.name)};

export default function Page() {
  const formRef = useRef<HTMLFormElement>(null);
  const agent = useEveAgent();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = String(data.get("message") ?? "").trim();
    if (!message || isBusy) return;
    formRef.current?.reset();
    await agent.send({ message });
  }

  return (
    <main className="shell">
      <section className="chat" aria-label={AGENT_NAME}>
        <header className="chatHeader">
          <div>
            <p className="eyebrow">eve agent</p>
            <h1>{AGENT_NAME}</h1>
          </div>
          <span className={\`status status--\${agent.status}\`}>{agent.status}</span>
        </header>

        <div className="messages" aria-live="polite">
          {agent.data.messages.length === 0 ? (
            <div className="empty">
              <p>Start a conversation with this generated agent.</p>
            </div>
          ) : (
            agent.data.messages.map((message) => (
              <article className={\`message message--\${message.role}\`} key={message.id}>
                <p className="role">{message.role}</p>
                {message.parts.map(renderPart)}
              </article>
            ))
          )}
          {agent.error ? <p className="error">{agent.error.message}</p> : null}
        </div>

        <form className="composer" ref={formRef} onSubmit={onSubmit}>
          <label className="srOnly" htmlFor="message">
            Message
          </label>
          <textarea id="message" name="message" placeholder="Send a message..." disabled={isBusy} />
          <button type="submit" disabled={isBusy}>
            {isBusy ? "Working" : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}

function renderPart(part: EvePart, index: number) {
  switch (part.type) {
    case "text":
      return <p key={\`text:\${index}\`}>{part.text}</p>;
    case "reasoning":
      return (
        <details className="reasoning" key={\`reasoning:\${index}\`}>
          <summary>Reasoning</summary>
          <p>{part.text}</p>
        </details>
      );
    case "dynamic-tool":
      return (
        <details className="tool" key={part.toolCallId}>
          <summary>{part.toolName}</summary>
          <pre>{JSON.stringify({ input: part.input, output: part.output }, null, 2)}</pre>
        </details>
      );
    default:
      return null;
  }
}
`;
}

function globalsCss(): string {
  return `:root {
  color-scheme: light;
  --background: #f6f5f2;
  --foreground: #171717;
  --muted: #6b665f;
  --surface: #ffffff;
  --surface-alt: #efede8;
  --border: #dedad2;
  --accent: #0f766e;
  --accent-foreground: #ffffff;
  --danger: #b42318;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-height: 100dvh;
  margin: 0;
  background: var(--background);
  color: var(--foreground);
}

button,
textarea {
  font: inherit;
}

.shell {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 24px;
}

.chat {
  display: grid;
  width: min(100%, 840px);
  min-height: min(780px, calc(100dvh - 48px));
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 24px 80px rgb(23 23 23 / 0.08);
}

.chatHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border);
  padding: 18px 20px;
}

.chatHeader h1,
.eyebrow,
.role,
.messages p {
  margin: 0;
}

.chatHeader h1 {
  font-size: clamp(24px, 5vw, 34px);
  line-height: 1.05;
}

.eyebrow,
.role {
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: uppercase;
}

.status {
  border-radius: 999px;
  background: var(--surface-alt);
  padding: 6px 10px;
  color: var(--muted);
  font-size: 13px;
}

.messages {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 18px 20px;
}

.empty {
  display: grid;
  min-height: 100%;
  place-items: center;
  color: var(--muted);
  text-align: center;
}

.message {
  max-width: 78%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--surface-alt);
}

.message--user {
  align-self: flex-end;
  background: #e8f3f1;
}

.message--assistant {
  align-self: flex-start;
}

.message p + p,
.reasoning,
.tool {
  margin-top: 8px;
}

.reasoning,
.tool {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.tool pre {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
}

.error {
  color: var(--danger);
}

.composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding: 14px;
}

.composer textarea {
  min-height: 54px;
  max-height: 160px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}

.composer button {
  min-width: 88px;
  border: 0;
  border-radius: 8px;
  background: var(--accent);
  color: var(--accent-foreground);
  cursor: pointer;
  font-weight: 600;
}

.composer button:disabled,
.composer textarea:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .shell {
    padding: 0;
  }

  .chat {
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .message {
    max-width: 92%;
  }

  .composer {
    grid-template-columns: 1fr;
  }
}
`;
}

function tsconfigJson(): string {
  return `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".eve/**/*.d.ts",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
`;
}

function gitignore(): string {
  return `node_modules
.env*
.dev.vars
.eve
.vercel
.wrangler
.workflow-data
.next
.open-next
.output
.nitro
dist
*.tsbuildinfo
`;
}

function vercelJson(): string {
  return JSON.stringify(
    {
      framework: "nextjs",
      buildCommand: "pnpm build",
      installCommand: "pnpm install",
    },
    null,
    2,
  );
}

function railwayJson(): string {
  return JSON.stringify(
    {
      $schema: "https://railway.com/railway.schema.json",
      build: {
        builder: "NIXPACKS",
        buildCommand: "pnpm install && pnpm build",
      },
      deploy: {
        startCommand: "pnpm start",
        healthcheckPath: "/",
        restartPolicyType: "ON_FAILURE",
        restartPolicyMaxRetries: 10,
      },
    },
    null,
    2,
  );
}

function dockerfile(): string {
  return `FROM node:24-slim AS app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app

COPY package.json ./
RUN pnpm install --prod=false

COPY . .
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
`;
}

function dockerignore(): string {
  return `node_modules
.env*
.dev.vars
.git
.next
.open-next
.output
.vercel
.wrangler
.workflow-data
`;
}

function composeYaml(): string {
  return `services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
`;
}

function wranglerJsonc(config: AgentProjectConfig): string {
  const slug = resourceSlug(config);
  const workerConfig: Record<string, unknown> = {
    $schema: "./node_modules/wrangler/config-schema.json",
    name: config.name,
    main: ".open-next/worker.js",
    compatibility_date: "2026-06-19",
    compatibility_flags: ["nodejs_compat"],
    assets: {
      directory: ".open-next/assets",
      binding: "ASSETS",
    },
    observability: {
      enabled: true,
    },
  };

  if (hasCloudflareProvider(config, "cloudflare-kv")) {
    workerConfig.kv_namespaces = [
      {
        binding: "EVE_KV",
      },
    ];
  }

  if (hasCloudflareProvider(config, "cloudflare-d1")) {
    workerConfig.d1_databases = [
      {
        binding: "EVE_D1",
      },
    ];
  }

  if (hasCloudflareProvider(config, "cloudflare-r2")) {
    workerConfig.r2_buckets = [
      {
        binding: "EVE_R2",
      },
    ];
  }

  if (hasCloudflareProvider(config, "cloudflare-vectorize")) {
    workerConfig.vectorize = [
      {
        binding: "EVE_VECTORIZE",
        index_name: `${slug}-vectors`,
      },
    ];
  }

  if (hasCloudflareProvider(config, "cloudflare-queues")) {
    workerConfig.queues = {
      producers: [
        {
          binding: "EVE_QUEUE",
          queue: `${slug}-queue`,
        },
      ],
      consumers: [
        {
          queue: `${slug}-queue`,
        },
      ],
    };
  }

  if (hasCloudflareProvider(config, "cloudflare-hyperdrive")) {
    workerConfig.hyperdrive = [
      {
        binding: "EVE_HYPERDRIVE",
        id: "00000000000000000000000000000000",
      },
    ];
  }

  if (hasCloudflareProvider(config, "cloudflare-workers-ai")) {
    workerConfig.ai = {
      binding: "AI",
    };
  }

  if (hasCloudflareProvider(config, "cloudflare-browser")) {
    workerConfig.browser = {
      binding: "BROWSER",
    };
  }

  if (hasCloudflareProvider(config, "cloudflare-analytics-engine")) {
    workerConfig.analytics_engine_datasets = [
      {
        binding: "EVE_ANALYTICS",
        dataset: `${slug}-analytics`,
      },
    ];
  }

  if (hasCloudflareProvider(config, "cloudflare-images")) {
    workerConfig.images = {
      binding: "IMAGES",
    };
  }

  if (hasCloudflareProvider(config, "cloudflare-ai-search")) {
    workerConfig.ai_search_namespaces = [
      {
        binding: "EVE_AI_SEARCH",
        namespace: "default",
      },
    ];
  }

  return `${JSON.stringify(workerConfig, null, 2)}\n`;
}

function openNextConfig(): string {
  return `import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
`;
}

function fastPathLines(
  config: AgentProjectConfig,
  action: ReturnType<typeof deploymentManifest>["deploymentActions"][DeploymentTarget],
): string[] {
  if (config.deployMode === "docker") {
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

  if (config.deployMode === "local") {
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

function deployGuide(config: AgentProjectConfig): string {
  const manifest = deploymentManifest(config);
  const source = resolveDeploymentSource(config);
  const cloudflareProviders = enabledCloudflareProviders(config);
  const action = manifest.deploymentActions[config.deployMode];
  const oneClickButtons = [
    manifest.deploymentActions.vercel.buttonMarkdown,
    manifest.deploymentActions.cloudflare.buttonMarkdown,
    manifest.deploymentActions.railway.buttonMarkdown,
  ].filter(Boolean);
  const sourceLines =
    source.kind === "user-repository"
      ? [`Repository: ${source.repositoryUrl}`]
      : source.kind === "service-template"
        ? [
            `Template repository: ${source.repositoryUrl}`,
            source.configurationUrl
              ? `Agent config URL: ${source.configurationUrl}`
              : "Set `EVE_AGENT_CONFIG_URL` in the deployment flow before deploying the template.",
          ]
        : [
            "Publish this exported folder to a public GitHub or GitLab repository, then replace `YOUR_PUBLIC_GIT_REPO_URL` in the links below.",
          ];
  const serviceLines =
    config.serviceProviders.length > 0
      ? [
          "",
          "## Services",
          "",
          ...config.serviceProviders.map((provider) => `- ${SERVICE_LABELS[provider]}`),
          ...(cloudflareProviders.length > 0
            ? [
                "",
                "Cloudflare-native services are declared in `wrangler.jsonc` for Deploy to Cloudflare resource provisioning.",
                "D1, KV, and R2 use binding-only declarations so Cloudflare can provision those resources during deploy.",
              ]
            : []),
        ]
      : [];

  return [
    "# One-click deployment",
    "",
    `Primary target: ${TARGET_LABELS[config.deployMode]}`,
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
    "## Embed snippets",
    "",
    "```md",
    ...oneClickButtons,
    "```",
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

function deploymentFiles(config: AgentProjectConfig): Record<string, string> {
  const files: Record<string, string> = {
    "deploy/manifest.json": JSON.stringify(deploymentManifest(config), null, 2),
    "deploy/one-click.md": deployGuide(config),
    "vercel.json": vercelJson(),
    "railway.json": railwayJson(),
    Dockerfile: dockerfile(),
    ".dockerignore": dockerignore(),
    "compose.yaml": composeYaml(),
  };

  if (config.deployMode === "cloudflare") {
    files["wrangler.jsonc"] = wranglerJsonc(config);
    files["open-next.config.ts"] = openNextConfig();
    files[".dev.vars.example"] = envExample(config);
  }

  return files;
}

function serviceFiles(config: AgentProjectConfig): Record<string, string> {
  const files: Record<string, string> = {};
  const cloudflareProviders = enabledCloudflareProviders(config);

  if (config.serviceProviders.includes("supabase")) {
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

  if (config.serviceProviders.includes("upstash")) {
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

  if (cloudflareProviders.length > 0) {
    const bindingEntries = Object.fromEntries(
      cloudflareProviders.map((provider) => [provider, CLOUDFLARE_BINDINGS[provider]]),
    );
    files["lib/cloudflare-bindings.ts"] =
      `export const cloudflareBindings = ${JSON.stringify(bindingEntries, null, 2)} as const;

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

export function generateProjectFiles(config: AgentProjectConfig): Record<string, string> {
  config = normalizeAgentProjectConfig(config);
  const instrumentation = instrumentationTemplate(config);
  const env = envExample(config);
  const files: Record<string, string> = {
    "agent/agent.ts": agentTs(config),
    "agent/instructions.md": resolveInstructionsForExport(config.instructions, config.name),
    "app/layout.tsx": layoutTsx(config),
    "app/page.tsx": pageTsx(config),
    "app/globals.css": globalsCss(),
    "next.config.ts": nextConfig(),
    "next-env.d.ts": nextEnvDts(),
    "package.json": JSON.stringify(packageJson(config), null, 2),
    "tsconfig.json": tsconfigJson(),
    ".gitignore": gitignore(),
    ".env.example": env,
    ...deploymentFiles(config),
    ...serviceFiles(config),
  };

  if (config.sandboxEnabled) {
    files["agent/sandbox/workspace/.gitkeep"] = "";
  }

  if (instrumentation) {
    files["agent/instrumentation.ts"] = instrumentation;
  }

  Object.assign(files, promptManagementTemplate(config));

  for (const tool of enabled(config.capabilities, "tool")) {
    files[`agent/tools/${tool.name}.ts`] = toolTemplate(
      tool.name,
      tool.description,
      tool.requiresApproval ?? false,
    );
  }

  for (const tool of config.capabilities.filter(
    (item) => item.kind === "framework-tool" && !item.enabled,
  )) {
    files[`agent/tools/${tool.name}.ts`] = `import { disableTool } from "eve/tools";

export default disableTool();
`;
  }

  for (const skill of enabled(config.capabilities, "skill")) {
    Object.assign(files, exportSkillFiles(skill));
  }

  for (const subagent of enabled(config.capabilities, "subagent")) {
    files[`agent/subagents/${subagent.name}/agent.ts`] = subagentTemplate(
      subagent.description,
      config.model,
    );
    files[`agent/subagents/${subagent.name}/instructions.md`] =
      `# ${subagent.name}\n\n${subagent.description}\n`;
  }

  for (const schedule of enabled(config.capabilities, "schedule")) {
    files[`agent/schedules/${schedule.name}.ts`] = scheduleTemplate(
      schedule.name,
      schedule.cron ?? "0 9 * * 1",
      schedule.description,
    );
  }

  for (const hook of enabled(config.capabilities, "hook")) {
    files[`agent/hooks/${hook.name}.ts`] = hookTemplate();
  }

  for (const connection of enabled(config.capabilities, "connection")) {
    const slug = connection.slug ?? connection.name;
    const template = connectionFileForSlug(slug);
    files[`agent/connections/${connection.name}.ts`] =
      template ??
      `import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  description: ${JSON.stringify(connection.description)},
  url: "https://mcp.example.com/sse",
});
`;
  }

  for (const channel of enabled(config.capabilities, "channel")) {
    const slug = channel.slug ?? channel.name;
    files[`agent/channels/${channel.name}.ts`] = channelFileForSlug(slug, config.name);
  }

  files["agent/channels/eve.ts"] ??= channelFileForSlug("eve", config.name);

  files["evals/evals.config.ts"] = evalConfigTemplate(config);
  files["evals/smoke.eval.ts"] = smokeEvalTemplate(config);

  return files;
}

export function projectReadme(config: AgentProjectConfig): string {
  const target = TARGET_LABELS[config.deployMode];
  const manifest = deploymentManifest(config);
  const source = resolveDeploymentSource(config);
  const cloudflareProviders = enabledCloudflareProviders(config);
  const observability =
    config.observabilityProvider === "braintrust"
      ? [
          "## Braintrust",
          "",
          "This export is preconfigured for Braintrust tracing, prompt management, and eval reporting.",
          "Set `BRAINTRUST_API_KEY` in your deployment environment. Override `BRAINTRUST_PARENT` or `BRAINTRUST_PROJECT` if you want traces and evals to land somewhere other than the generated project name.",
          "Run `pnpm run prompt:push` after credentials are set to publish `agent/instructions.md` as the managed Braintrust prompt.",
        ]
      : config.observabilityProvider === "langfuse"
        ? [
            "## Langfuse",
            "",
            "This export is preconfigured for Langfuse tracing, prompt management, and eval score reporting.",
            "Set `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_BASE_URL` in your deployment environment.",
            "Run `pnpm run prompt:push` after credentials are set to publish `agent/instructions.md` as a Langfuse prompt version.",
          ]
        : [];

  return [
    `# ${config.name}`,
    "",
    "Generated by eve Agent Builder as a standalone agent app. This export contains the runtime agent, chat frontend, and deployment manifests only.",
    "",
    `Primary deployment target: ${target}`,
    source.kind === "user-repository" ? `Repository: ${source.repositoryUrl}` : "",
    source.kind === "service-template" ? `Template repository: ${source.repositoryUrl}` : "",
    "",
    "```sh",
    "pnpm install",
    "cp .env.example .env.local",
    "pnpm dev",
    "```",
    "",
    "Open the app at `http://localhost:3000` and chat with the generated agent.",
    "",
    "Run evals:",
    "",
    "```sh",
    "pnpm run eval",
    "```",
    "",
    "## Deploy",
    "",
    "One-click deploy links and platform-specific notes live in `deploy/one-click.md`.",
    "",
    "Required environment keys:",
    "",
    ...manifest.environmentVariables.map(
      (variable) =>
        `- \`${variable.key}\` (${variable.category}, ${variable.secret ? "secret" : "plain"}): ${variable.description}`,
    ),
    "",
    config.deployMode === "cloudflare"
      ? "For Cloudflare Workers, use `pnpm run deploy` after adding secrets in Cloudflare Workers Builds or Wrangler. Selected Cloudflare resources are declared in `wrangler.jsonc`."
      : config.deployMode === "docker"
        ? "For Docker, use `docker compose up --build`."
        : config.deployMode === "railway"
          ? "For Railway, import the repository and keep the generated `railway.json` build and start commands."
          : config.deployMode === "local"
            ? "For local hosting, run `pnpm build && pnpm start` behind your own process manager."
            : "For Vercel, import the repository from `https://vercel.com/new` or use the generated Deploy Button.",
    "",
    cloudflareProviders.length > 0
      ? `Cloudflare bindings: ${cloudflareProviders.map((provider) => CLOUDFLARE_BINDINGS[provider]).join(", ")}`
      : "",
    "",
    "",
    ...observability,
    "",
  ].join("\n");
}

export function projectSummary(config: AgentProjectConfig): {
  active: string[];
  inactive: string[];
} {
  const active: string[] = [];
  const inactive: string[] = [];

  if (config.compactionEnabled) active.push("Compaction");
  else inactive.push("Compaction");

  if (config.codeMode) active.push("Code mode");
  else inactive.push("Code mode");

  if (config.sandboxEnabled) active.push("Sandbox");
  else inactive.push("Sandbox");

  if (config.workflowEnabled) active.push("Workflow");
  else inactive.push("Workflow");

  active.push(`Deploy: ${TARGET_LABELS[config.deployMode]}`);

  if (config.observabilityProvider === "none") inactive.push("Observability");
  else active.push(`Observability: ${config.observabilityProvider}`);

  if (config.serviceProviders.length > 0) {
    for (const provider of config.serviceProviders)
      active.push(`Service: ${SERVICE_LABELS[provider]}`);
  } else {
    inactive.push("Production services");
  }

  for (const item of config.capabilities) {
    const label = `${item.kind}: ${item.name}`;
    if (item.enabled) active.push(label);
    else inactive.push(label);
  }

  return { active, inactive };
}
