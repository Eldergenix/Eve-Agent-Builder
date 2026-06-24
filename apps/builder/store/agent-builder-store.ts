import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import {
  createDefaultProject,
  isServiceProviderAvailableForTarget,
  normalizeDeploymentTarget,
  normalizeObservabilityProvider,
  normalizeRepositoryUrl,
  normalizeServiceProviders,
  productionStackForPreset,
  type AgentProjectConfig,
  type DeploymentTarget,
  type ObservabilityProvider,
  type ProductionServiceProvider,
  type ProductionStackPreset,
} from "@/lib/agent-config/defaults";
import {
  applyAgentTemplate,
  isAgentTemplateId,
  type AgentTemplateId,
} from "@/lib/agent-config/agent-templates";
import { clampConfigFormStep } from "@/lib/agent-config/form-steps";
import { upsertAgentNameInInstructions } from "@/lib/agent-config/instructions-name";
import { clearPersistedState, defaultPersistedState } from "@/lib/agent-config/persistence";
import type { CapabilityItem } from "@/types";

export type CenterView = "spec" | "preview" | "files";

type BuilderStore = AgentProjectConfig & {
  centerView: CenterView;
  selectedCapabilityId: string | null;
  leftTab: "capabilities" | "catalog";
  rightTab: "config" | "runtime";
  searchQuery: string;
  configFormStep: number;
  isDirty: boolean;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setModel: (model: string) => void;
  setInstructions: (instructions: string) => void;
  setEvalPrompt: (evalPrompt: string) => void;
  setEvalAssertion: (evalAssertion: string) => void;
  setAgentTemplate: (templateId: AgentTemplateId) => void;
  setCompactionEnabled: (enabled: boolean) => void;
  setCompactionThreshold: (threshold: number) => void;
  setCodeMode: (enabled: boolean) => void;
  setOutputSchemaEnabled: (enabled: boolean) => void;
  setExternalDependencies: (value: string) => void;
  setSandboxEnabled: (enabled: boolean) => void;
  setWorkflowEnabled: (enabled: boolean) => void;
  setRepositoryUrl: (repositoryUrl: string) => void;
  setDeployMode: (deployMode: DeploymentTarget) => void;
  setObservabilityProvider: (provider: ObservabilityProvider) => void;
  setServiceProviderEnabled: (provider: ProductionServiceProvider, enabled: boolean) => void;
  setProductionStackPreset: (preset: ProductionStackPreset) => void;
  toggleCapability: (id: string) => void;
  setCapabilityEnabled: (id: string, enabled: boolean) => void;
  updateCapability: (
    id: string,
    patch: Partial<Pick<CapabilityItem, "description" | "requiresApproval" | "cron" | "name">>,
  ) => void;
  addCatalogCapability: (item: CapabilityItem) => void;
  removeSkill: (id: string) => void;
  setSelectedCapabilityId: (id: string | null) => void;
  setCenterView: (view: CenterView) => void;
  setLeftTab: (tab: "capabilities" | "catalog") => void;
  setRightTab: (tab: "config" | "runtime") => void;
  setSearchQuery: (searchQuery: string) => void;
  setConfigFormStep: (step: number) => void;
  importProject: (config: AgentProjectConfig) => void;
  hydrate: (partial: Partial<ReturnType<typeof defaultPersistedState>>) => void;
  markSaved: () => void;
  resetProject: () => void;
};

function markDirty<T extends object>(patch: T): T & { isDirty: true } {
  return { ...patch, isDirty: true };
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  ...createDefaultProject(),
  centerView: "spec",
  selectedCapabilityId: null,
  leftTab: "capabilities",
  rightTab: "config",
  searchQuery: "",
  configFormStep: 0,
  isDirty: false,

  setName: (name) =>
    set(
      markDirty({
        name,
        instructions: upsertAgentNameInInstructions(get().instructions, name),
      }),
    ),
  setDescription: (description) => set(markDirty({ description })),
  setModel: (model) => set(markDirty({ model })),
  setInstructions: (instructions) => set(markDirty({ instructions })),
  setEvalPrompt: (evalPrompt) => set(markDirty({ evalPrompt })),
  setEvalAssertion: (evalAssertion) => set(markDirty({ evalAssertion })),
  setAgentTemplate: (templateId) =>
    set(
      markDirty(
        applyAgentTemplate(
          {
            agentTemplateId: get().agentTemplateId,
            name: get().name,
            description: get().description,
            model: get().model,
            instructions: get().instructions,
            evalPrompt: get().evalPrompt,
            evalAssertion: get().evalAssertion,
            compactionEnabled: get().compactionEnabled,
            compactionThreshold: get().compactionThreshold,
            codeMode: get().codeMode,
            outputSchemaEnabled: get().outputSchemaEnabled,
            externalDependencies: get().externalDependencies,
            sandboxEnabled: get().sandboxEnabled,
            workflowEnabled: get().workflowEnabled,
            repositoryUrl: get().repositoryUrl,
            deployMode: get().deployMode,
            observabilityProvider: get().observabilityProvider,
            serviceProviders: get().serviceProviders,
            capabilities: get().capabilities,
          },
          templateId,
        ),
      ),
    ),
  setCompactionEnabled: (compactionEnabled) => set(markDirty({ compactionEnabled })),
  setCompactionThreshold: (compactionThreshold) => set(markDirty({ compactionThreshold })),
  setCodeMode: (codeMode) => set(markDirty({ codeMode })),
  setOutputSchemaEnabled: (outputSchemaEnabled) => set(markDirty({ outputSchemaEnabled })),
  setExternalDependencies: (externalDependencies) => set(markDirty({ externalDependencies })),
  setSandboxEnabled: (sandboxEnabled) => set(markDirty({ sandboxEnabled })),
  setWorkflowEnabled: (workflowEnabled) => set(markDirty({ workflowEnabled })),
  setRepositoryUrl: (repositoryUrl) =>
    set(markDirty({ repositoryUrl: normalizeRepositoryUrl(repositoryUrl) })),
  setDeployMode: (deployMode) =>
    set(
      markDirty({
        deployMode,
        serviceProviders: normalizeServiceProviders(get().serviceProviders, deployMode),
      }),
    ),
  setObservabilityProvider: (observabilityProvider) => set(markDirty({ observabilityProvider })),
  setServiceProviderEnabled: (provider, enabled) => {
    if (enabled && !isServiceProviderAvailableForTarget(provider, get().deployMode)) return;

    set(
      markDirty({
        serviceProviders: enabled
          ? [...new Set([...get().serviceProviders, provider])]
          : get().serviceProviders.filter((item) => item !== provider),
      }),
    );
  },
  setProductionStackPreset: (preset) => {
    const stack = productionStackForPreset(preset, get().deployMode);
    if (!stack) return;
    set(markDirty(stack));
  },

  toggleCapability: (id) =>
    set(
      markDirty({
        capabilities: get().capabilities.map((item) =>
          item.id === id ? { ...item, enabled: !item.enabled } : item,
        ),
      }),
    ),

  setCapabilityEnabled: (id, enabled) =>
    set(
      markDirty({
        capabilities: get().capabilities.map((item) =>
          item.id === id ? { ...item, enabled } : item,
        ),
      }),
    ),

  updateCapability: (id, patch) =>
    set(
      markDirty({
        capabilities: get().capabilities.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      }),
    ),

  addCatalogCapability: (item) => {
    const exists = get().capabilities.some((c) => c.id === item.id);
    if (exists) {
      get().setCapabilityEnabled(item.id, true);
      return;
    }
    set(markDirty({ capabilities: [...get().capabilities, { ...item, enabled: true }] }));
  },

  removeSkill: (id) =>
    set(
      markDirty({
        capabilities: get().capabilities.filter((item) => item.id !== id),
      }),
    ),

  setSelectedCapabilityId: (selectedCapabilityId) => set(markDirty({ selectedCapabilityId })),
  setCenterView: (centerView) => set(markDirty({ centerView })),
  setLeftTab: (leftTab) => set(markDirty({ leftTab })),
  setRightTab: (rightTab) => set(markDirty({ rightTab })),
  setSearchQuery: (searchQuery) => set(markDirty({ searchQuery })),
  setConfigFormStep: (step) => set({ configFormStep: clampConfigFormStep(step) }),

  importProject: (config) => {
    const deployMode = normalizeDeploymentTarget(config.deployMode);
    set(
      markDirty({
        ...config,
        agentTemplateId: isAgentTemplateId(config.agentTemplateId)
          ? config.agentTemplateId
          : "custom",
        observabilityProvider: normalizeObservabilityProvider(
          config.observabilityProvider,
          (config as { instrumentationEnabled?: unknown }).instrumentationEnabled === true,
        ),
        repositoryUrl: normalizeRepositoryUrl(config.repositoryUrl),
        deployMode,
        serviceProviders: normalizeServiceProviders(config.serviceProviders, deployMode),
        centerView: get().centerView,
        selectedCapabilityId: null,
      }),
    );
  },

  hydrate: (partial) => {
    const defaults = defaultPersistedState();
    const name = partial.name ?? defaults.name;
    const instructions = upsertAgentNameInInstructions(
      partial.instructions ?? defaults.instructions,
      name,
    );

    const deployMode = normalizeDeploymentTarget(partial.deployMode);

    set({
      ...defaults,
      ...partial,
      agentTemplateId:
        partial.agentTemplateId && isAgentTemplateId(partial.agentTemplateId)
          ? partial.agentTemplateId
          : "custom",
      instructions,
      repositoryUrl: normalizeRepositoryUrl(partial.repositoryUrl),
      deployMode,
      observabilityProvider: normalizeObservabilityProvider(
        partial.observabilityProvider,
        (partial as { instrumentationEnabled?: unknown }).instrumentationEnabled === true,
      ),
      serviceProviders: normalizeServiceProviders(partial.serviceProviders, deployMode),
      isDirty: false,
    });
  },

  markSaved: () => set({ isDirty: false }),

  resetProject: () => {
    clearPersistedState();
    set({
      ...createDefaultProject(),
      centerView: "spec",
      selectedCapabilityId: null,
      leftTab: "capabilities",
      rightTab: "config",
      searchQuery: "",
      configFormStep: 0,
      isDirty: false,
    });
  },
}));

export function selectProjectConfig(state: BuilderStore): AgentProjectConfig {
  return {
    agentTemplateId: state.agentTemplateId,
    name: state.name,
    description: state.description,
    model: state.model,
    instructions: state.instructions,
    evalPrompt: state.evalPrompt,
    evalAssertion: state.evalAssertion,
    compactionEnabled: state.compactionEnabled,
    compactionThreshold: state.compactionThreshold,
    codeMode: state.codeMode,
    outputSchemaEnabled: state.outputSchemaEnabled,
    externalDependencies: state.externalDependencies,
    sandboxEnabled: state.sandboxEnabled,
    workflowEnabled: state.workflowEnabled,
    repositoryUrl: state.repositoryUrl,
    deployMode: state.deployMode,
    observabilityProvider: state.observabilityProvider,
    serviceProviders: state.serviceProviders,
    capabilities: state.capabilities,
  };
}

/** Stable shallow subscription — avoids new-object selector loops in React 19. */
export function useProjectConfig(): AgentProjectConfig {
  return useBuilderStore(useShallow(selectProjectConfig));
}
