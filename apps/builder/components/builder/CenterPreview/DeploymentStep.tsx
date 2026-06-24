"use client";

import { type ReactNode, useMemo, useState } from "react";

import Button from "@/components/Button";
import DeploymentTargetLogo from "@/components/builder/DeploymentTargetLogo";
import ServiceProviderLogo from "@/components/builder/ServiceProviderLogo";
import SegmentToggle from "@/components/SegmentToggle";
import Switch from "@/components/Switch";
import {
  DEPLOYMENT_TARGET_OPTIONS,
  PRODUCTION_STACK_PRESET_OPTIONS,
  PRODUCTION_SERVICE_OPTIONS,
  isServiceProviderAvailableForTarget,
  productionStackPresetForConfig,
  type DeploymentTarget,
  type ProductionStackPreset,
} from "@/lib/agent-config/defaults";
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
} from "@/lib/export-project";
import { selectProjectConfig, useBuilderStore } from "@/store/agent-builder-store";

const OBSERVABILITY_OPTIONS = [
  { id: "none", label: "None" },
  { id: "braintrust", label: "Braintrust" },
  { id: "langfuse", label: "Langfuse" },
];

const MANAGED_TEMPLATE_REPOSITORY_URL =
  process.env.NEXT_PUBLIC_EVE_AGENT_TEMPLATE_REPOSITORY_URL?.trim() || null;
const MANAGED_RAILWAY_TEMPLATE_URL =
  process.env.NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL?.trim() || null;

function SectionBlock({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 ${className ?? ""}`}>
      <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body-md-str text-primary">{title}</h3>
          {description ? <p className="mt-0.5 text-body-sm text-secondary">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md border border-s-01 bg-surface-02 px-2 text-body-sm text-secondary">
      {children}
    </span>
  );
}

async function copyDeploymentConfiguration(
  deployment: Awaited<ReturnType<typeof prepareDeployment>>,
): Promise<boolean> {
  const assignment = deploymentConfigurationAssignment(deployment);
  if (!assignment || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(assignment);
    return true;
  } catch {
    return false;
  }
}

const DeploymentStep = () => {
  const deployMode = useBuilderStore((s) => s.deployMode);
  const repositoryUrl = useBuilderStore((s) => s.repositoryUrl);
  const serviceProviders = useBuilderStore((s) => s.serviceProviders);
  const observabilityProvider = useBuilderStore((s) => s.observabilityProvider);
  const setDeployMode = useBuilderStore((s) => s.setDeployMode);
  const setRepositoryUrl = useBuilderStore((s) => s.setRepositoryUrl);
  const setObservabilityProvider = useBuilderStore((s) => s.setObservabilityProvider);
  const setServiceProviderEnabled = useBuilderStore((s) => s.setServiceProviderEnabled);
  const setProductionStackPreset = useBuilderStore((s) => s.setProductionStackPreset);
  const markSaved = useBuilderStore((s) => s.markSaved);
  const [isDeploying, setIsDeploying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const serviceOptions = useMemo(
    () =>
      PRODUCTION_SERVICE_OPTIONS.filter((provider) =>
        isServiceProviderAvailableForTarget(provider.id, deployMode),
      ),
    [deployMode],
  );
  const presetOptions = useMemo(
    () =>
      PRODUCTION_STACK_PRESET_OPTIONS.filter(
        (preset) => !preset.deployTargets || preset.deployTargets.includes(deployMode),
      ),
    [deployMode],
  );
  const stackPreset = useMemo(() => {
    const config = selectProjectConfig(useBuilderStore.getState());
    return productionStackPresetForConfig(config);
  }, [deployMode, observabilityProvider, serviceProviders]);
  const selectedDeploymentAction = useMemo(() => {
    const config = selectProjectConfig(useBuilderStore.getState());
    return deploymentActions(config)[deployMode];
  }, [deployMode, observabilityProvider, repositoryUrl, serviceProviders]);
  const readiness = deploymentReadinessForTarget({
    deployMode,
    repositoryUrl,
    managedTemplateRepositoryUrl: MANAGED_TEMPLATE_REPOSITORY_URL,
    managedRailwayTemplateUrl: MANAGED_RAILWAY_TEMPLATE_URL,
  });
  const ctaLabel = deploymentCtaLabel(
    selectedDeploymentAction.label,
    deployMode,
    readiness.oneClickReady,
  );

  async function handlePrepareDeployment() {
    setIsDeploying(true);
    setStatus(null);
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
        setStatus(
          deploymentLaunchStatusMessage({
            deployment,
            hasLaunchUrl: true,
            copiedConfiguration,
            noLaunchMessage: "Export ready. Use the generated Docker files.",
            exportedPrefix: "Export ready",
          }),
        );
      } else {
        closeReservedDeploymentWindow(reservedWindow);
        setStatus(
          deploymentLaunchStatusMessage({
            deployment,
            hasLaunchUrl: false,
            copiedConfiguration,
            noLaunchMessage: "Export ready. Use the generated Docker files.",
            exportedPrefix: "Export ready",
          }),
        );
      }
    } catch {
      closeReservedDeploymentWindow(reservedWindow);
      setStatus("Deployment export failed.");
    } finally {
      setIsDeploying(false);
    }
  }

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scrollbar-none">
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.62fr)]">
            <div className="grid min-w-0 gap-4">
              <SectionBlock
                title="Repository"
                description="Use a public repository for hosted deploy buttons, or leave this blank to use the managed template path."
                aside={<StatusPill>{readiness.sourceLabel}</StatusPill>}
              >
                <input
                  id="deployment-repo-url"
                  className="h-10 w-full rounded-[0.625rem] border border-s-01 bg-surface-03 px-3 text-body-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  name="deployment-repo-url"
                  placeholder="https://github.com/acme/my-eve-agent"
                  autoComplete="url"
                  spellCheck={false}
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                />
              </SectionBlock>

              <SectionBlock title="Deploy target">
                <SegmentToggle
                  ariaLabel="Deploy target"
                  className="h-auto min-h-9 flex-wrap"
                  options={[...DEPLOYMENT_TARGET_OPTIONS]}
                  value={deployMode}
                  onChange={(id) => setDeployMode(id as typeof deployMode)}
                  renderIcon={(option) => (
                    <DeploymentTargetLogo target={option.id as DeploymentTarget} />
                  )}
                />
              </SectionBlock>
            </div>

            <div className="grid min-w-0 content-start gap-4 border-t border-s-01 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
              <SectionBlock
                title="Platform readiness"
                aside={<StatusPill>{readiness.statusLabel}</StatusPill>}
              >
                <p className="rounded-xl bg-surface-03 px-3 py-2 text-body-sm text-secondary">
                  {readiness.detail}
                </p>
              </SectionBlock>

              <SectionBlock title="Deployment path">
                <ol className="grid gap-2 text-body-sm text-secondary">
                  {selectedDeploymentAction.steps.slice(0, 5).map((step, index) => (
                    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2" key={step}>
                      <span className="flex size-6 items-center justify-center rounded-full bg-surface-03 text-body-sm text-primary">
                        {index + 1}
                      </span>
                      <span className="pt-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </SectionBlock>
            </div>
          </div>

          <div className="grid gap-5 border-t border-s-01 pt-5 md:grid-cols-2">
            <SectionBlock title="Observability">
              <SegmentToggle
                ariaLabel="Observability provider"
                className="h-auto min-h-9 flex-wrap"
                options={OBSERVABILITY_OPTIONS}
                value={observabilityProvider}
                onChange={(id) => setObservabilityProvider(id as typeof observabilityProvider)}
              />
            </SectionBlock>

            <SectionBlock title="Stack preset">
              <SegmentToggle
                ariaLabel="Production stack preset"
                className="h-auto min-h-9 flex-wrap"
                options={[...presetOptions]}
                value={stackPreset}
                onChange={(id) => setProductionStackPreset(id as ProductionStackPreset)}
              />
            </SectionBlock>
          </div>

          <SectionBlock
            title="Production services"
            description="Only services available for the selected deploy target are shown."
            className="border-t border-s-01 pt-5"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {serviceOptions.map((provider) => {
                const checked = serviceProviders.includes(provider.id);

                return (
                  <div
                    key={provider.id}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
                      checked
                        ? "border-s-02 bg-surface-03"
                        : "border-s-01 bg-surface-03/45 hover:bg-surface-03"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-body-md text-primary">
                      <ServiceProviderLogo providerId={provider.id} />
                      <span className="min-w-0 truncate">{provider.label}</span>
                    </span>
                    <Switch
                      checked={checked}
                      onChange={(nextChecked) =>
                        setServiceProviderEnabled(provider.id, nextChecked)
                      }
                      aria-label={`Toggle ${provider.label}`}
                    />
                  </div>
                );
              })}
            </div>
          </SectionBlock>

          <SectionBlock
            title="Required keys"
            description="These are the variables the selected deploy path will ask the user to provide."
            className="border-t border-s-01 pt-5"
          >
            <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain pr-1 scrollbar-none sm:grid-cols-2">
              {selectedDeploymentAction.environmentVariables.map((variable) => (
                <div
                  key={variable.key}
                  className="grid gap-1 rounded-xl border border-s-01 bg-surface-03/70 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <code className="max-w-full truncate text-body-sm text-primary">
                      {variable.key}
                    </code>
                    <StatusPill>{variable.category}</StatusPill>
                    <StatusPill>{variable.secret ? "secret" : "plain"}</StatusPill>
                  </div>
                  <p className="text-body-sm text-secondary">{variable.description}</p>
                </div>
              ))}
            </div>
          </SectionBlock>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-col gap-2 border-t border-s-01 bg-surface-01 pt-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          isPrimary
          className="w-full sm:w-auto"
          onClick={handlePrepareDeployment}
          disabled={isDeploying}
        >
          {isDeploying ? "Preparing..." : ctaLabel}
        </Button>
        {status ? (
          <p className="text-body-sm text-secondary" aria-live="polite">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default DeploymentStep;
