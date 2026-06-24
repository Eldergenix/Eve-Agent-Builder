"use client";

import { useMemo, useState } from "react";

import Button from "@/components/Button";
import { deploymentActions } from "@/lib/agent-config/deployment";
import {
  deploymentCtaLabel,
  deploymentLaunchStatusMessage,
  deploymentReadinessForTarget,
} from "@/lib/agent-config/deployment-readiness";
import {
  closeReservedDeploymentWindow,
  deploymentConfigurationAssignment,
  downloadBlob,
  exportProjectZip,
  navigateReservedDeploymentWindow,
  prepareDeployment,
  reserveDeploymentWindow,
  type DeploymentPreparation,
} from "@/lib/export-project";
import { selectProjectConfig, useBuilderStore } from "@/store/agent-builder-store";

const MANAGED_TEMPLATE_REPOSITORY_URL =
  process.env.NEXT_PUBLIC_EVE_AGENT_TEMPLATE_REPOSITORY_URL?.trim() || null;
const MANAGED_RAILWAY_TEMPLATE_URL =
  process.env.NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL?.trim() || null;

async function copyDeploymentConfiguration(deployment: DeploymentPreparation): Promise<boolean> {
  const assignment = deploymentConfigurationAssignment(deployment);
  if (!assignment || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(assignment);
    return true;
  } catch {
    return false;
  }
}

type BuilderActionsProps = {
  className?: string;
};

const BuilderActions = ({ className }: BuilderActionsProps) => {
  const deployMode = useBuilderStore((s) => s.deployMode);
  const repositoryUrl = useBuilderStore((s) => s.repositoryUrl);
  const observabilityProvider = useBuilderStore((s) => s.observabilityProvider);
  const serviceProviders = useBuilderStore((s) => s.serviceProviders);
  const markSaved = useBuilderStore((s) => s.markSaved);
  const [exporting, setExporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const readiness = useMemo(
    () =>
      deploymentReadinessForTarget({
        deployMode,
        repositoryUrl,
        managedTemplateRepositoryUrl: MANAGED_TEMPLATE_REPOSITORY_URL,
        managedRailwayTemplateUrl: MANAGED_RAILWAY_TEMPLATE_URL,
      }),
    [deployMode, repositoryUrl],
  );
  const deployActionLabel = useMemo(() => {
    const config = selectProjectConfig(useBuilderStore.getState());
    return deploymentActions(config)[deployMode].label;
  }, [deployMode, observabilityProvider, repositoryUrl, serviceProviders]);
  const deployButtonLabel = deploymentCtaLabel(
    deployActionLabel,
    deployMode,
    readiness.oneClickReady,
  );

  async function handleExport() {
    setExporting(true);
    setStatusMessage(null);
    try {
      const config = selectProjectConfig(useBuilderStore.getState());
      const blob = await exportProjectZip(config);
      downloadBlob(blob, `${config.name}.zip`);
      markSaved();
      setStatusMessage("Agent project downloaded.");
    } catch {
      setStatusMessage("Download failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeploy() {
    setDeploying(true);
    setStatusMessage(null);
    const config = selectProjectConfig(useBuilderStore.getState());
    const reservedWindow = reserveDeploymentWindow(config.deployMode);
    try {
      const deployment = await prepareDeployment(config);
      if (deployment.zipRequired) {
        const blob = await exportProjectZip(config);
        downloadBlob(blob, `${config.name}.zip`);
      }
      const copiedConfiguration = await copyDeploymentConfiguration(deployment);
      markSaved();

      if (deployment.launchUrl) {
        navigateReservedDeploymentWindow(reservedWindow, deployment.launchUrl);
        setStatusMessage(
          deploymentLaunchStatusMessage({
            deployment,
            hasLaunchUrl: true,
            copiedConfiguration,
            noLaunchMessage:
              "Project exported. Follow the generated deploy/one-click.md instructions.",
            exportedPrefix: "Project exported",
          }),
        );
      } else {
        closeReservedDeploymentWindow(reservedWindow);
        setStatusMessage(
          deploymentLaunchStatusMessage({
            deployment,
            hasLaunchUrl: false,
            copiedConfiguration,
            noLaunchMessage:
              "Project exported. Follow the generated deploy/one-click.md instructions.",
            exportedPrefix: "Project exported",
          }),
        );
      }
    } catch {
      closeReservedDeploymentWindow(reservedWindow);
      setStatusMessage("Deploy preparation failed. Try again.");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className={`grid gap-2 ${className ?? ""}`} role="group" aria-label="Builder actions">
      <Button className="w-full !px-3" isPrimary onClick={handleExport} disabled={exporting}>
        {exporting ? "Downloading..." : "Download"}
      </Button>
      <Button className="w-full !px-3" isSecondary onClick={handleDeploy} disabled={deploying}>
        {deploying ? "Preparing..." : deployButtonLabel}
      </Button>
      {statusMessage ? (
        <p className="text-body-sm text-secondary" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
};

export default BuilderActions;
