import {
  CUSTOM_TEMPLATE_INSTRUCTIONS,
  TEMPLATE_INSTRUCTIONS,
} from "@/lib/agent-config/agent-template-instructions";
import {
  createDefaultCapabilities,
  createDefaultProject,
  type AgentProjectConfig,
  type ObservabilityProvider,
} from "@/lib/agent-config/defaults";
import {
  ensureAgentNamePlaceholder,
  upsertAgentNameInInstructions,
} from "@/lib/agent-config/instructions-name";
import type { CapabilityItem } from "@/types";

export type AgentTemplateId =
  | "linear"
  | "datadog"
  | "notion"
  | "honeycomb"
  | "project-management"
  | "discord"
  | "slack"
  | "teams"
  | "telegram"
  | "github"
  | "custom";

export type AgentTemplate = {
  id: AgentTemplateId;
  label: string;
  summary: string;
  name: string;
  description: string;
  instructions: string;
  evalPrompt: string;
  evalAssertion: string;
  enabledCapabilityIds: readonly string[];
  observabilityProvider?: ObservabilityProvider;
};

const FRAMEWORK_TOOL_IDS = [
  "framework-bash",
  "framework-readFile",
  "framework-writeFile",
  "framework-glob",
  "framework-grep",
  "framework-webFetch",
  "framework-webSearch",
  "framework-todo",
  "framework-loadSkill",
  "framework-agent",
] as const;

const WEB_CHAT = "channel-eve";

function baseTools(...extra: string[]): string[] {
  return [...FRAMEWORK_TOOL_IDS, WEB_CHAT, ...extra];
}

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
  {
    id: "linear",
    label: "Linear agent",
    summary: "Triage issues, update projects, and summarize cycles in Linear.",
    name: "linear-agent",
    description: "An eve agent for Linear issue and project workflows.",
    enabledCapabilityIds: baseTools("connection-linear", "channel-linear-agent"),
    evalPrompt: "List my open Linear issues.",
    evalAssertion: "issue",
    instructions: TEMPLATE_INSTRUCTIONS.linear,
  },
  {
    id: "datadog",
    label: "Datadog agent",
    summary: "Investigate monitors, metrics, logs, and incidents in Datadog.",
    name: "datadog-agent",
    description: "An observability copilot for Datadog metrics, logs, and incidents.",
    enabledCapabilityIds: baseTools("connection-datadog"),
    evalPrompt: "What Datadog monitors are currently alerting?",
    evalAssertion: "monitor",
    instructions: TEMPLATE_INSTRUCTIONS.datadog,
  },
  {
    id: "notion",
    label: "Notion agent",
    summary: "Search, draft, and organize Notion pages and databases.",
    name: "notion-agent",
    description: "An eve agent for Notion knowledge base workflows.",
    enabledCapabilityIds: baseTools("connection-notion"),
    evalPrompt: "Search Notion for our onboarding doc.",
    evalAssertion: "onboarding",
    instructions: TEMPLATE_INSTRUCTIONS.notion,
  },
  {
    id: "honeycomb",
    label: "Honeycomb agent",
    summary: "Explore traces, run queries, and debug production behavior.",
    name: "honeycomb-agent",
    description: "An eve agent for Honeycomb trace and query workflows.",
    enabledCapabilityIds: baseTools("connection-honeycomb"),
    evalPrompt: "Run a Honeycomb query for elevated latency in the last hour.",
    evalAssertion: "latency",
    instructions: TEMPLATE_INSTRUCTIONS.honeycomb,
  },
  {
    id: "project-management",
    label: "Project management agent",
    summary: "Coordinate work across Linear and Notion with structured task tracking.",
    name: "project-management-agent",
    description: "A cross-tool project management agent for planning and execution.",
    enabledCapabilityIds: baseTools("connection-linear", "connection-notion"),
    evalPrompt: "Summarize open work across Linear and Notion.",
    evalAssertion: "work",
    instructions: TEMPLATE_INSTRUCTIONS["project-management"],
  },
  {
    id: "discord",
    label: "Discord agent",
    summary: "Respond in Discord servers, threads, and DMs.",
    name: "discord-agent",
    description: "An eve agent delivered through a Discord bot channel.",
    enabledCapabilityIds: baseTools("channel-discord"),
    evalPrompt: "Introduce yourself in Discord.",
    evalAssertion: "help",
    instructions: TEMPLATE_INSTRUCTIONS.discord,
  },
  {
    id: "slack",
    label: "Slack agent",
    summary: "Answer questions and run workflows from Slack channels and DMs.",
    name: "slack-agent",
    description: "An eve agent delivered through Slack with Connect-managed auth.",
    enabledCapabilityIds: baseTools("channel-slack"),
    evalPrompt: "Reply helpfully to a Slack message.",
    evalAssertion: "help",
    instructions: TEMPLATE_INSTRUCTIONS.slack,
  },
  {
    id: "teams",
    label: "Teams agent",
    summary: "Support Microsoft Teams chats and channel conversations.",
    name: "teams-agent",
    description: "An eve agent for Microsoft Teams messaging workflows.",
    enabledCapabilityIds: baseTools("channel-teams"),
    evalPrompt: "Respond to a Teams chat message.",
    evalAssertion: "help",
    instructions: TEMPLATE_INSTRUCTIONS.teams,
  },
  {
    id: "telegram",
    label: "Telegram agent",
    summary: "Handle 1:1 and group conversations through a Telegram bot.",
    name: "telegram-agent",
    description: "An eve agent delivered through a Telegram bot channel.",
    enabledCapabilityIds: baseTools("channel-telegram"),
    evalPrompt: "Reply to a Telegram user message.",
    evalAssertion: "help",
    instructions: TEMPLATE_INSTRUCTIONS.telegram,
  },
  {
    id: "github",
    label: "GitHub agent",
    summary: "Triage issues, review pull requests, and respond in GitHub threads.",
    name: "github-agent",
    description: "An eve agent for GitHub issue and pull request workflows.",
    enabledCapabilityIds: baseTools("channel-github"),
    evalPrompt: "Summarize open pull requests awaiting review.",
    evalAssertion: "pull",
    instructions: TEMPLATE_INSTRUCTIONS.github,
  },
  {
    id: "custom",
    label: "Custom",
    summary: "Start from a blank agent and configure everything yourself.",
    name: createDefaultProject().name,
    description: createDefaultProject().description,
    enabledCapabilityIds: createDefaultCapabilities()
      .filter((item) => item.enabled)
      .map((item) => item.id),
    evalPrompt: createDefaultProject().evalPrompt,
    evalAssertion: createDefaultProject().evalAssertion,
    instructions: CUSTOM_TEMPLATE_INSTRUCTIONS,
  },
];

const TEMPLATE_BY_ID = new Map(AGENT_TEMPLATES.map((template) => [template.id, template]));

export function getAgentTemplate(id: AgentTemplateId): AgentTemplate {
  const template = TEMPLATE_BY_ID.get(id);
  if (!template) throw new Error(`Unknown agent template: ${id}`);
  return template;
}

export function applyCapabilitiesForTemplate(
  capabilities: CapabilityItem[],
  enabledCapabilityIds: readonly string[],
): CapabilityItem[] {
  const enabled = new Set(enabledCapabilityIds);
  return capabilities.map((item) => ({
    ...item,
    enabled: enabled.has(item.id),
  }));
}

export function applyAgentTemplate(
  config: AgentProjectConfig,
  templateId: AgentTemplateId,
): AgentProjectConfig {
  const template = getAgentTemplate(templateId);
  const baseCapabilities = applyCapabilitiesForTemplate(
    createDefaultCapabilities(),
    template.enabledCapabilityIds,
  );
  const installedSkills = config.capabilities.filter((item) => item.skillsShId);
  const capabilities = [
    ...baseCapabilities,
    ...installedSkills.filter((skill) => !baseCapabilities.some((item) => item.id === skill.id)),
  ];

  return {
    ...config,
    agentTemplateId: templateId,
    name: template.name,
    description: template.description,
    instructions: upsertAgentNameInInstructions(
      ensureAgentNamePlaceholder(template.instructions),
      template.name,
    ),
    evalPrompt: template.evalPrompt,
    evalAssertion: template.evalAssertion,
    observabilityProvider: template.observabilityProvider ?? config.observabilityProvider,
    capabilities,
  };
}

export function isAgentTemplateId(value: string): value is AgentTemplateId {
  return TEMPLATE_BY_ID.has(value as AgentTemplateId);
}
