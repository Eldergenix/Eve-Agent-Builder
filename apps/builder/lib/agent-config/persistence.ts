import {
  createDefaultProject,
  normalizeDeploymentTarget,
  normalizeObservabilityProvider,
  normalizeRepositoryUrl,
  normalizeServiceProviders,
  type AgentProjectConfig,
} from "@/lib/agent-config/defaults";
import type { CenterView } from "@/store/agent-builder-store";

export const STORAGE_KEY = "eve-agent-builder:v1";

export type PersistedBuilderState = AgentProjectConfig & {
  centerView: CenterView;
  selectedCapabilityId: string | null;
  leftTab: "capabilities" | "catalog";
  rightTab: "config" | "runtime";
  searchQuery: string;
};

export function defaultPersistedState(): PersistedBuilderState {
  return {
    ...createDefaultProject(),
    centerView: "spec",
    selectedCapabilityId: null,
    leftTab: "capabilities",
    rightTab: "config",
    searchQuery: "",
  };
}

export function loadPersistedState(): PersistedBuilderState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const state = { ...defaultPersistedState(), ...(parsed as PersistedBuilderState) };
    const legacy = parsed as { instrumentationEnabled?: unknown; observabilityProvider?: unknown };
    const deployMode = normalizeDeploymentTarget(state.deployMode);
    return {
      ...state,
      repositoryUrl: normalizeRepositoryUrl(state.repositoryUrl),
      deployMode,
      observabilityProvider: normalizeObservabilityProvider(
        legacy.observabilityProvider,
        legacy.instrumentationEnabled === true,
      ),
      serviceProviders: normalizeServiceProviders(state.serviceProviders, deployMode),
    };
  } catch {
    return null;
  }
}

export function savePersistedState(state: PersistedBuilderState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
