"use client";

import CapabilityDetail from "@/components/builder/CapabilityDetail";
import DeploymentTargetLogo from "@/components/builder/DeploymentTargetLogo";
import ServiceProviderLogo from "@/components/builder/ServiceProviderLogo";
import Group from "@/components/Group";
import ModelProviderSelect from "@/components/ModelProviderSelect";
import ModelSelect from "@/components/ModelSelect";
import SegmentToggle from "@/components/SegmentToggle";
import SliderControl from "@/components/SliderControl";
import Switch from "@/components/Switch";
import Tabs from "@/components/Tabs";
import { useGatewayModels } from "@/hooks/use-gateway-models";
import {
  DEPLOYMENT_TARGET_OPTIONS,
  PRODUCTION_SERVICE_OPTIONS,
  isServiceProviderAvailableForTarget,
  type DeploymentTarget,
} from "@/lib/agent-config/defaults";
import { useBuilderStore } from "@/store/agent-builder-store";
import type { TabItem } from "@/types";

const rightTabs: TabItem[] = [
  { id: 0, name: "Config" },
  { id: 1, name: "Runtime" },
];

type Props = {
  className?: string;
  tabsClassName?: string;
  contentClassName?: string;
  showCapabilityDetail?: boolean;
};

const AgentSettingsPanel = ({
  className,
  tabsClassName = "border-b border-s-01 px-4 py-3",
  contentClassName = "scrollbar-none grow overflow-y-auto overscroll-contain rounded-b-[1.25rem]",
  showCapabilityDetail = true,
}: Props) => {
  const store = useBuilderStore();
  const capabilities = useBuilderStore((s) => s.capabilities);
  const selectedCapabilityId = useBuilderStore((s) => s.selectedCapabilityId);
  const setDeployMode = useBuilderStore((s) => s.setDeployMode);
  const deployMode = useBuilderStore((s) => s.deployMode);
  const serviceProviders = useBuilderStore((s) => s.serviceProviders);
  const rightTab = useBuilderStore((s) => s.rightTab);
  const setRightTab = useBuilderStore((s) => s.setRightTab);
  const { options: gatewayModels, isLoading: modelsLoading } = useGatewayModels();

  const tab =
    rightTabs.find((t) => (rightTab === "config" ? t.id === 0 : t.id === 1)) ?? rightTabs[0];
  const selectedCapability = capabilities.find((c) => c.id === selectedCapabilityId) ?? null;

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className={tabsClassName}>
        <Tabs
          items={rightTabs}
          value={tab}
          setValue={(next) => setRightTab(next.id === 0 ? "config" : "runtime")}
        />
      </div>
      <div className={contentClassName}>
        {showCapabilityDetail && selectedCapability ? (
          <CapabilityDetail item={selectedCapability} />
        ) : null}
        {tab.id === 0 ? (
          <>
            <Group title="Model" withoutAddButton>
              <ModelSelect
                label="Model"
                value={store.model}
                onChange={store.setModel}
                options={gatewayModels}
                isLoading={modelsLoading}
                menuMinWidth="22rem"
              />
            </Group>
            <Group title="Provider" withoutAddButton>
              <ModelProviderSelect
                label="Provider"
                value={store.model}
                onChange={store.setModel}
                options={gatewayModels}
                isLoading={modelsLoading}
              />
            </Group>
            <Group
              title="Code mode"
              rightContent={
                <Switch
                  checked={store.codeMode}
                  onChange={store.setCodeMode}
                  aria-label="Toggle code mode"
                />
              }
              withoutAddButton
            />
            <Group
              title="Output schema"
              rightContent={
                <Switch
                  checked={store.outputSchemaEnabled}
                  onChange={store.setOutputSchemaEnabled}
                  aria-label="Toggle output schema"
                />
              }
              withoutAddButton
            />
            <Group
              title="Compaction"
              rightContent={
                <Switch
                  checked={store.compactionEnabled}
                  onChange={store.setCompactionEnabled}
                  aria-label="Toggle compaction"
                />
              }
              withoutAddButton
            />
            {store.compactionEnabled ? (
              <Group title="Threshold" withoutAddButton>
                <SliderControl
                  label="Threshold"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={store.compactionThreshold}
                  displayValue={`${Math.round(store.compactionThreshold * 100)}%`}
                  onChange={store.setCompactionThreshold}
                />
              </Group>
            ) : null}
            <Group title="External dependencies" withoutAddButton>
              <input
                className="h-10 w-full rounded-[0.625rem] border border-s-01 bg-surface-03 px-3 text-body-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                name="external-dependencies"
                placeholder="package-a, package-b..."
                autoComplete="off"
                spellCheck={false}
                value={store.externalDependencies}
                onChange={(e) => store.setExternalDependencies(e.target.value)}
              />
            </Group>
          </>
        ) : (
          <>
            <Group title="Deploy target" withoutAddButton>
              <SegmentToggle
                ariaLabel="Deploy target"
                size="compact"
                wrap
                options={[...DEPLOYMENT_TARGET_OPTIONS]}
                value={deployMode}
                onChange={(id) => setDeployMode(id as typeof deployMode)}
                renderIcon={(option) => (
                  <DeploymentTargetLogo target={option.id as DeploymentTarget} />
                )}
              />
            </Group>
            <Group title="Repository URL" withoutAddButton>
              <input
                className="h-10 w-full rounded-[0.625rem] border border-s-01 bg-surface-03 px-3 text-body-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                name="repository-url"
                placeholder="https://github.com/acme/my-eve-agent"
                autoComplete="url"
                spellCheck={false}
                value={store.repositoryUrl}
                onChange={(e) => store.setRepositoryUrl(e.target.value)}
              />
            </Group>
            <Group
              title="Sandbox"
              rightContent={
                <Switch
                  checked={store.sandboxEnabled}
                  onChange={store.setSandboxEnabled}
                  aria-label="Toggle sandbox"
                />
              }
              withoutAddButton
            />
            <Group
              title="Workflow"
              rightContent={
                <Switch
                  checked={store.workflowEnabled}
                  onChange={store.setWorkflowEnabled}
                  aria-label="Toggle workflow"
                />
              }
              withoutAddButton
            />
            <Group title="Observability" withoutAddButton>
              <SegmentToggle
                ariaLabel="Observability provider"
                options={[
                  { id: "none", label: "None" },
                  { id: "braintrust", label: "Braintrust" },
                  { id: "langfuse", label: "Langfuse" },
                ]}
                value={store.observabilityProvider}
                onChange={(id) =>
                  store.setObservabilityProvider(id as typeof store.observabilityProvider)
                }
              />
            </Group>
            {PRODUCTION_SERVICE_OPTIONS.filter((provider) =>
              isServiceProviderAvailableForTarget(provider.id, deployMode),
            ).map((provider) => (
              <div key={provider.id} className="border-t border-s-01 first:border-t-0">
                <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-body-md-str text-primary">
                    <ServiceProviderLogo providerId={provider.id} />
                    <span className="min-w-0 truncate">{provider.label}</span>
                  </span>
                  <Switch
                    checked={serviceProviders.includes(provider.id)}
                    onChange={(checked) => store.setServiceProviderEnabled(provider.id, checked)}
                    aria-label={`Toggle ${provider.label}`}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AgentSettingsPanel;
