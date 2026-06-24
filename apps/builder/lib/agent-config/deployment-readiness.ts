import type { DeploymentTarget } from "@/lib/agent-config/defaults";
import type { DeploymentPreparation } from "@/lib/agent-config/deployment";

const TARGET_NAMES: Record<DeploymentTarget, string> = {
  cloudflare: "Cloudflare",
  docker: "Docker",
  local: "Local",
  railway: "Railway",
  vercel: "Vercel",
};

export type DeploymentReadiness = {
  sourceLabel: string;
  statusLabel: string;
  detail: string;
  oneClickReady: boolean;
};

export type DeploymentReadinessInput = {
  deployMode: DeploymentTarget;
  repositoryUrl: string;
  managedTemplateRepositoryUrl?: string | null;
  managedRailwayTemplateUrl?: string | null;
};

export function deploymentReadinessForTarget({
  deployMode,
  repositoryUrl,
  managedTemplateRepositoryUrl,
  managedRailwayTemplateUrl,
}: DeploymentReadinessInput): DeploymentReadiness {
  if (deployMode === "docker") {
    return {
      sourceLabel: "Docker export",
      statusLabel: "Manual",
      detail: "Downloads the standalone app with Dockerfile, compose.yaml, and env examples.",
      oneClickReady: false,
    };
  }

  if (deployMode === "local") {
    return {
      sourceLabel: "Local export",
      statusLabel: "Manual",
      detail: "Downloads the standalone app for local install, build, and process hosting.",
      oneClickReady: false,
    };
  }

  if (repositoryUrl.trim()) {
    return {
      sourceLabel: "User repository",
      statusLabel: "Ready",
      detail: `${TARGET_NAMES[deployMode]} will open with the standalone repository path.`,
      oneClickReady: true,
    };
  }

  if (deployMode === "railway" && managedTemplateRepositoryUrl && !managedRailwayTemplateUrl) {
    return {
      sourceLabel: "Template setup required",
      statusLabel: "Export first",
      detail:
        "Railway needs the managed template published and NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL configured before direct launch.",
      oneClickReady: false,
    };
  }

  if (managedTemplateRepositoryUrl) {
    return {
      sourceLabel: "Managed template",
      statusLabel: "Ready",
      detail:
        deployMode === "railway"
          ? "Railway will open the managed template and ask for the copied EVE_AGENT_CONFIG_URL."
          : `${TARGET_NAMES[deployMode]} will open the managed template for this generated agent.`,
      oneClickReady: true,
    };
  }

  return {
    sourceLabel: "Exported project",
    statusLabel: "Repository required",
    detail:
      "Export the standalone app, publish it to a public repository, then continue in the selected platform.",
    oneClickReady: false,
  };
}

export function deploymentCtaLabel(
  deploymentActionLabel: string,
  deployMode: DeploymentTarget,
  oneClickReady: boolean,
): string {
  if (oneClickReady) return deploymentActionLabel;
  return "Deploy";
}

export function deploymentLaunchStatusMessage({
  deployment,
  hasLaunchUrl,
  copiedConfiguration,
  noLaunchMessage,
  exportedPrefix,
}: {
  deployment: DeploymentPreparation;
  hasLaunchUrl: boolean;
  copiedConfiguration: boolean;
  noLaunchMessage: string;
  exportedPrefix: string;
}): string {
  if (!hasLaunchUrl) return noLaunchMessage;

  if (deployment.zipRequired) {
    return `${exportedPrefix}. ${
      deployment.notes[0] ?? "Follow the generated deploy/one-click.md instructions."
    }`;
  }

  if (deployment.status === "ready") return "Deployment flow opened.";

  if (deployment.status === "needs-template-configuration") {
    if (deployment.configurationEnvironmentValue) {
      return copiedConfiguration
        ? "Deployment flow opened. Paste the copied EVE_AGENT_CONFIG_URL when prompted."
        : "Deployment flow opened. Copy EVE_AGENT_CONFIG_URL from deploy/manifest.json when prompted.";
    }
    return `${exportedPrefix}. Configure the template source URL before one-click deploy.`;
  }

  if (deployment.status === "needs-repository") {
    return `${exportedPrefix}. Publish it to a public repo, then continue in the opened platform.`;
  }

  return `${exportedPrefix}. Continue in the opened deployment flow.`;
}
