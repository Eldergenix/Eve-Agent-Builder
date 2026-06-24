import { CUSTOM_TEMPLATE_INSTRUCTIONS } from "@/lib/agent-config/agent-template-instructions";
import type { AgentTemplateId } from "@/lib/agent-config/agent-templates";
import { upsertAgentNameInInstructions } from "@/lib/agent-config/instructions-name";
import { DEFAULT_MODEL } from "@/lib/ai-gateway/models";
import type { CapabilityItem } from "@/types";
import { channelEntries, connectionEntries } from "@vercel/eve-catalog";

const FRAMEWORK_TOOLS: CapabilityItem[] = [
  {
    id: "framework-bash",
    kind: "framework-tool",
    name: "bash",
    description: "Run shell commands in the agent sandbox.",
    enabled: true,
    icon: "terminal",
  },
  {
    id: "framework-readFile",
    kind: "framework-tool",
    name: "readFile",
    description: "Read files from the workspace.",
    enabled: true,
    icon: "show-view",
  },
  {
    id: "framework-writeFile",
    kind: "framework-tool",
    name: "writeFile",
    description: "Write files to the workspace.",
    enabled: true,
    icon: "pencil",
  },
  {
    id: "framework-glob",
    kind: "framework-tool",
    name: "glob",
    description: "Find files by glob pattern.",
    enabled: true,
    icon: "folder",
  },
  {
    id: "framework-grep",
    kind: "framework-tool",
    name: "grep",
    description: "Search file contents with regex.",
    enabled: true,
    icon: "filter",
  },
  {
    id: "framework-webFetch",
    kind: "framework-tool",
    name: "webFetch",
    description: "Fetch web pages and APIs.",
    enabled: true,
    icon: "download",
  },
  {
    id: "framework-webSearch",
    kind: "framework-tool",
    name: "webSearch",
    description: "Search the web for information.",
    enabled: true,
    icon: "explore",
  },
  {
    id: "framework-todo",
    kind: "framework-tool",
    name: "todo",
    description: "Track multi-step tasks.",
    enabled: true,
    icon: "check-circle",
  },
  {
    id: "framework-loadSkill",
    kind: "framework-tool",
    name: "loadSkill",
    description: "Load on-demand skill procedures.",
    enabled: true,
    icon: "sparkle",
  },
  {
    id: "framework-agent",
    kind: "framework-tool",
    name: "agent",
    description: "Delegate subtasks to a copy of this agent.",
    enabled: true,
    icon: "people",
  },
];

const AUTHORED_TOOLS: CapabilityItem[] = [
  {
    id: "tool-get_weather",
    kind: "tool",
    name: "get_weather",
    description: "Return mock weather data for a city.",
    enabled: true,
    icon: "sun",
    requiresApproval: false,
  },
  {
    id: "tool-whoami",
    kind: "tool",
    name: "whoami",
    description: "Return the authenticated user identity.",
    enabled: false,
    icon: "profile",
    requiresApproval: true,
  },
];

const SKILLS: CapabilityItem[] = [
  {
    id: "skill-get-weather",
    kind: "skill",
    name: "get-weather",
    description: "Procedure for fetching and summarizing weather.",
    enabled: true,
    icon: "bulb",
  },
];

const SUBAGENTS: CapabilityItem[] = [
  {
    id: "subagent-researcher",
    kind: "subagent",
    name: "researcher",
    description: "Investigate ambiguous questions before responding.",
    enabled: false,
    icon: "cube-think",
  },
];

const SCHEDULES: CapabilityItem[] = [
  {
    id: "schedule-weekly-recap",
    kind: "schedule",
    name: "weekly_recap",
    description: "Summarize activity every Monday at 9am.",
    enabled: false,
    icon: "clock",
    cron: "0 9 * * 1",
  },
];

const HOOKS: CapabilityItem[] = [
  {
    id: "hook-session-audit",
    kind: "hook",
    name: "session-audit",
    description: "Log session lifecycle events for observability.",
    enabled: false,
    icon: "general",
  },
];

function catalogChannels(): CapabilityItem[] {
  return channelEntries().map((entry) => ({
    id: `channel-${entry.slug}`,
    kind: "channel" as const,
    name: entry.slug,
    description: entry.tagline,
    enabled: entry.slug === "eve",
    icon: entry.slug === "slack" ? "message" : "message",
    slug: entry.slug,
  }));
}

function catalogConnections(): CapabilityItem[] {
  return connectionEntries().map((entry) => ({
    id: `connection-${entry.slug}`,
    kind: "connection" as const,
    name: entry.slug,
    description: entry.tagline,
    enabled: false,
    icon: "link",
    slug: entry.slug,
  }));
}

export { DEFAULT_MODEL } from "@/lib/ai-gateway/models";

export function createDefaultCapabilities(): CapabilityItem[] {
  return [
    ...AUTHORED_TOOLS,
    ...FRAMEWORK_TOOLS,
    ...catalogConnections(),
    ...catalogChannels(),
    ...SKILLS,
    ...SUBAGENTS,
    ...SCHEDULES,
    ...HOOKS,
  ];
}

export type AgentProjectConfig = {
  agentTemplateId: AgentTemplateId;
  name: string;
  description: string;
  model: string;
  instructions: string;
  evalPrompt: string;
  evalAssertion: string;
  compactionEnabled: boolean;
  compactionThreshold: number;
  codeMode: boolean;
  outputSchemaEnabled: boolean;
  externalDependencies: string;
  sandboxEnabled: boolean;
  workflowEnabled: boolean;
  repositoryUrl: string;
  deployMode: DeploymentTarget;
  observabilityProvider: ObservabilityProvider;
  serviceProviders: ProductionServiceProvider[];
  capabilities: CapabilityItem[];
};

export type DeploymentTarget = "vercel" | "cloudflare" | "railway" | "docker" | "local";

export type ObservabilityProvider = "none" | "braintrust" | "langfuse";

export type ProductionStackPreset =
  | "minimal"
  | "portable-production"
  | "cloudflare-native"
  | "custom";

export type ProductionServiceProvider =
  | "supabase"
  | "upstash"
  | "cloudflare-d1"
  | "cloudflare-kv"
  | "cloudflare-r2"
  | "cloudflare-vectorize"
  | "cloudflare-queues"
  | "cloudflare-hyperdrive"
  | "cloudflare-workers-ai"
  | "cloudflare-browser"
  | "cloudflare-analytics-engine"
  | "cloudflare-images"
  | "cloudflare-ai-search";

const CLOUDFLARE_NATIVE_PROVIDERS: readonly ProductionServiceProvider[] = [
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
];

export const DEPLOYMENT_TARGET_OPTIONS: readonly {
  id: DeploymentTarget;
  label: string;
}[] = [
  { id: "vercel", label: "Vercel" },
  { id: "cloudflare", label: "Cloudflare" },
  { id: "railway", label: "Railway" },
  { id: "docker", label: "Docker" },
  { id: "local", label: "Local" },
];

export const PRODUCTION_SERVICE_OPTIONS: readonly {
  id: ProductionServiceProvider;
  label: string;
  deployTargets?: readonly DeploymentTarget[];
}[] = [
  { id: "supabase", label: "Supabase" },
  { id: "upstash", label: "Upstash Redis" },
  { id: "cloudflare-d1", label: "Cloudflare D1", deployTargets: ["cloudflare"] },
  { id: "cloudflare-kv", label: "Cloudflare KV", deployTargets: ["cloudflare"] },
  { id: "cloudflare-r2", label: "Cloudflare R2", deployTargets: ["cloudflare"] },
  {
    id: "cloudflare-vectorize",
    label: "Cloudflare Vectorize",
    deployTargets: ["cloudflare"],
  },
  { id: "cloudflare-queues", label: "Cloudflare Queues", deployTargets: ["cloudflare"] },
  { id: "cloudflare-hyperdrive", label: "Cloudflare Hyperdrive", deployTargets: ["cloudflare"] },
  { id: "cloudflare-workers-ai", label: "Cloudflare Workers AI", deployTargets: ["cloudflare"] },
  {
    id: "cloudflare-browser",
    label: "Cloudflare Browser Rendering",
    deployTargets: ["cloudflare"],
  },
  {
    id: "cloudflare-analytics-engine",
    label: "Cloudflare Analytics Engine",
    deployTargets: ["cloudflare"],
  },
  { id: "cloudflare-images", label: "Cloudflare Images", deployTargets: ["cloudflare"] },
  { id: "cloudflare-ai-search", label: "Cloudflare AI Search", deployTargets: ["cloudflare"] },
];

export const PRODUCTION_STACK_PRESET_OPTIONS: readonly {
  id: ProductionStackPreset;
  label: string;
  deployTargets?: readonly DeploymentTarget[];
}[] = [
  { id: "minimal", label: "Minimal" },
  { id: "portable-production", label: "Production" },
  { id: "cloudflare-native", label: "Cloudflare", deployTargets: ["cloudflare"] },
  { id: "custom", label: "Custom" },
];

export function normalizeDeploymentTarget(value: unknown): DeploymentTarget {
  return value === "cloudflare" ||
    value === "railway" ||
    value === "docker" ||
    value === "local" ||
    value === "vercel"
    ? value
    : "vercel";
}

export function normalizeObservabilityProvider(
  value: unknown,
  fallbackEnabled = false,
): ObservabilityProvider {
  if (value === "braintrust" || value === "langfuse" || value === "none") return value;
  return fallbackEnabled ? "braintrust" : "none";
}

export function isServiceProviderAvailableForTarget(
  provider: ProductionServiceProvider,
  target: DeploymentTarget,
): boolean {
  const option = PRODUCTION_SERVICE_OPTIONS.find((item) => item.id === provider);
  return !option?.deployTargets || option.deployTargets.includes(target);
}

export function normalizeServiceProviders(
  value: unknown,
  target?: DeploymentTarget,
): ProductionServiceProvider[] {
  if (!Array.isArray(value)) return [];
  const providers = new Set<ProductionServiceProvider>();
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
      const provider = item satisfies ProductionServiceProvider;
      if (!target || isServiceProviderAvailableForTarget(provider, target)) providers.add(provider);
    }
  }
  return [...providers];
}

export function productionStackForPreset(
  preset: ProductionStackPreset,
  target: DeploymentTarget,
): Pick<AgentProjectConfig, "observabilityProvider" | "serviceProviders"> | null {
  if (preset === "custom") return null;

  if (preset === "minimal") {
    return {
      observabilityProvider: "none",
      serviceProviders: [],
    };
  }

  if (preset === "portable-production") {
    return {
      observabilityProvider: "langfuse",
      serviceProviders: normalizeServiceProviders(["supabase", "upstash"], target),
    };
  }

  if (target !== "cloudflare") return null;

  return {
    observabilityProvider: "langfuse",
    serviceProviders: [...CLOUDFLARE_NATIVE_PROVIDERS],
  };
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

export function productionStackPresetForConfig(
  config: Pick<AgentProjectConfig, "deployMode" | "observabilityProvider" | "serviceProviders">,
): ProductionStackPreset {
  for (const option of PRODUCTION_STACK_PRESET_OPTIONS) {
    if (option.id === "custom") continue;
    const stack = productionStackForPreset(option.id, config.deployMode);
    if (
      stack &&
      stack.observabilityProvider === config.observabilityProvider &&
      sameStringSet(stack.serviceProviders, config.serviceProviders)
    ) {
      return option.id;
    }
  }
  return "custom";
}

export function normalizeRepositoryUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function createDefaultProject(): AgentProjectConfig {
  return {
    agentTemplateId: "custom",
    name: "my-eve-agent",
    description: "A durable AI agent built with eve.",
    model: DEFAULT_MODEL,
    instructions: upsertAgentNameInInstructions(CUSTOM_TEMPLATE_INSTRUCTIONS, "my-eve-agent"),
    evalPrompt: "Reply with the word ok.",
    evalAssertion: "ok",
    compactionEnabled: true,
    compactionThreshold: 0.9,
    codeMode: false,
    outputSchemaEnabled: false,
    externalDependencies: "",
    sandboxEnabled: true,
    workflowEnabled: true,
    repositoryUrl: "",
    deployMode: "vercel",
    observabilityProvider: "none",
    serviceProviders: [],
    capabilities: createDefaultCapabilities(),
  };
}

export function normalizeAgentProjectConfig(value: unknown): AgentProjectConfig {
  const defaults = createDefaultProject();
  const partial = value && typeof value === "object" ? (value as Partial<AgentProjectConfig>) : {};
  const merged = { ...defaults, ...partial };
  const deployMode = normalizeDeploymentTarget(merged.deployMode);

  return {
    ...merged,
    name:
      typeof merged.name === "string" && merged.name.trim() ? merged.name.trim() : defaults.name,
    repositoryUrl: normalizeRepositoryUrl(merged.repositoryUrl),
    deployMode,
    observabilityProvider: normalizeObservabilityProvider(
      merged.observabilityProvider,
      (partial as { instrumentationEnabled?: unknown }).instrumentationEnabled === true,
    ),
    serviceProviders: normalizeServiceProviders(merged.serviceProviders, deployMode),
    capabilities: Array.isArray(merged.capabilities) ? merged.capabilities : defaults.capabilities,
  };
}
