import {
  prepareDeployment as buildDeploymentPreparation,
  type DeploymentPreparation,
} from "@/lib/agent-config/deployment";
import type { AgentProjectConfig, DeploymentTarget } from "@/lib/agent-config/defaults";

export type { DeploymentPreparation } from "@/lib/agent-config/deployment";
export type ReservedDeploymentWindow = Window | null;

function isHostedDeploymentTarget(mode: DeploymentTarget): boolean {
  return mode === "vercel" || mode === "cloudflare" || mode === "railway";
}

export function reserveDeploymentWindow(mode: DeploymentTarget): ReservedDeploymentWindow {
  if (!isHostedDeploymentTarget(mode) || typeof window === "undefined") return null;

  const reservedWindow = window.open("about:blank", "_blank");
  if (reservedWindow) reservedWindow.opener = null;
  return reservedWindow;
}

export function closeReservedDeploymentWindow(reservedWindow: ReservedDeploymentWindow): void {
  if (reservedWindow && !reservedWindow.closed) reservedWindow.close();
}

export function navigateReservedDeploymentWindow(
  reservedWindow: ReservedDeploymentWindow,
  launchUrl: string | null,
): boolean {
  if (!launchUrl) {
    closeReservedDeploymentWindow(reservedWindow);
    return false;
  }

  if (reservedWindow && !reservedWindow.closed) {
    reservedWindow.location.href = launchUrl;
    return true;
  }

  if (typeof window === "undefined") return false;
  const openedWindow = window.open(launchUrl, "_blank");
  if (openedWindow) openedWindow.opener = null;
  return Boolean(openedWindow);
}

export async function exportProjectZip(config: AgentProjectConfig): Promise<Blob> {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function prepareDeployment(
  config: AgentProjectConfig,
): Promise<DeploymentPreparation> {
  const response = await fetch("/api/deploy/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error("Deploy preparation failed");
  return response.json() as Promise<DeploymentPreparation>;
}

export function deploymentConfigurationAssignment(
  deployment: DeploymentPreparation,
): string | null {
  if (!deployment.configurationEnvironmentKey || !deployment.configurationEnvironmentValue) {
    return null;
  }

  return `${deployment.configurationEnvironmentKey}=${deployment.configurationEnvironmentValue}`;
}

export function deploymentLaunchUrl(
  config: AgentProjectConfig,
  mode: DeploymentTarget,
): string | null {
  return buildDeploymentPreparation({ ...config, deployMode: mode }).launchUrl;
}

function deploymentFastPath(
  action: DeploymentPreparation["deploymentActions"][DeploymentTarget],
): string[] {
  if (action.target === "docker") {
    return [
      "",
      "Fast path:",
      "",
      "```sh",
      "cp .env.example .env.local",
      "docker compose up --build",
      "```",
      "",
      "Open http://localhost:3000 after the container starts.",
    ];
  }

  if (action.target === "local") {
    return [
      "",
      "Fast path:",
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
      "",
      "Fast path:",
      "",
      action.buttonMarkdown,
      "",
      "Add the required keys in the platform prompt, deploy, then open the generated chat frontend.",
    ];
  }

  if (action.url) {
    return [
      "",
      "Fast path:",
      "",
      `Open ${action.url}`,
      "",
      "Add the required keys in the platform prompt, deploy, then open the generated chat frontend.",
    ];
  }

  return [];
}

export function deployInstructions(config: AgentProjectConfig, mode: DeploymentTarget): string {
  const deployment = buildDeploymentPreparation({ ...config, deployMode: mode });
  const action = deployment.deploymentActions[mode];
  const source =
    deployment.source.kind === "user-repository"
      ? `Repository: ${deployment.source.repositoryUrl}`
      : deployment.source.kind === "service-template"
        ? `Template repository: ${deployment.source.repositoryUrl}`
        : "Source: exported standalone project";
  const deployButton = action.buttonMarkdown
    ? ["", "Deploy button:", "", action.buttonMarkdown]
    : [];
  const launchUrl = action.url ? ["", `Launch URL: ${action.url}`] : [];
  const notes =
    deployment.notes.length > 0
      ? ["", "Notes:", ...deployment.notes.map((note) => `- ${note}`)]
      : [];

  return [
    `# ${config.name}`,
    "",
    `Target: ${action.label}`,
    source,
    ...launchUrl,
    ...deployButton,
    ...deploymentFastPath(action),
    "",
    "Steps:",
    ...action.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Environment variables:",
    ...action.environmentVariables.map(
      (variable) =>
        `- ${variable.key} (${variable.category}, ${variable.secret ? "secret" : "plain"}): ${variable.description}`,
    ),
    "",
    "Generated deployment files:",
    "- deploy/manifest.json",
    "- deploy/one-click.md",
    "- .env.example",
    ...notes,
  ].join("\n");
}
