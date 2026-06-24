"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  loadPersistedState,
  savePersistedState,
  type PersistedBuilderState,
} from "@/lib/agent-config/persistence";
import {
  normalizeDeploymentTarget,
  normalizeRepositoryUrl,
  normalizeServiceProviders,
} from "@/lib/agent-config/defaults";
import { useBuilderStore } from "@/store/agent-builder-store";

function readUrlState(params: URLSearchParams): Partial<PersistedBuilderState> {
  const next: Partial<PersistedBuilderState> = {};
  const view = params.get("view");
  if (view === "spec" || view === "files" || view === "preview") next.centerView = view;
  const cap = params.get("cap");
  if (cap) next.selectedCapabilityId = cap;
  const left = params.get("left");
  if (left === "catalog") next.leftTab = "catalog";
  if (left === "active") next.leftTab = "capabilities";
  const right = params.get("right");
  if (right === "runtime") next.rightTab = "runtime";
  if (right === "config") next.rightTab = "config";
  const q = params.get("q");
  if (q) next.searchQuery = q;
  const deploy = params.get("deploy");
  if (deploy) next.deployMode = normalizeDeploymentTarget(deploy);
  const repo = params.get("repo");
  if (repo) next.repositoryUrl = normalizeRepositoryUrl(repo);
  const services = params.get("services");
  if (services) next.serviceProviders = normalizeServiceProviders(services.split(","));
  return next;
}

function writeUrlState(state: PersistedBuilderState): string {
  const params = new URLSearchParams();
  if (state.centerView !== "spec") params.set("view", state.centerView);
  if (state.selectedCapabilityId) params.set("cap", state.selectedCapabilityId);
  if (state.leftTab === "catalog") params.set("left", "catalog");
  if (state.rightTab === "runtime") params.set("right", "runtime");
  if (state.searchQuery.trim()) params.set("q", state.searchQuery.trim());
  if (state.deployMode !== "vercel") params.set("deploy", state.deployMode);
  if (state.repositoryUrl.trim()) params.set("repo", state.repositoryUrl.trim());
  if (state.serviceProviders.length > 0) params.set("services", state.serviceProviders.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function toPersistedState(
  state: ReturnType<typeof useBuilderStore.getState>,
): PersistedBuilderState {
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
    centerView: state.centerView,
    selectedCapabilityId: state.selectedCapabilityId,
    leftTab: state.leftTab,
    rightTab: state.rightTab,
    searchQuery: state.searchQuery,
  };
}

type Props = {
  children: React.ReactNode;
};

const BuilderShell = ({ children }: Props) => {
  const hydrated = useRef(false);
  const lastQueryRef = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const fromStorage = loadPersistedState();
    const fromUrl = readUrlState(searchParams);
    const merged = { ...fromStorage, ...fromUrl };
    useBuilderStore.getState().hydrate(merged);
    lastQueryRef.current = writeUrlState({ ...toPersistedState(useBuilderStore.getState()) });

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[name="capability-search"]');
        input?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Hydrate once from the first URL snapshot only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;

    const syncPersistence = (state: ReturnType<typeof useBuilderStore.getState>) => {
      const persisted = toPersistedState(state);
      savePersistedState(persisted);
      const nextQuery = writeUrlState(persisted);
      if (lastQueryRef.current === nextQuery) return;
      lastQueryRef.current = nextQuery;
      router.replace(`${pathname}${nextQuery}`, { scroll: false });
    };

    syncPersistence(useBuilderStore.getState());
    const unsubscribe = useBuilderStore.subscribe(syncPersistence);
    return unsubscribe;
  }, [pathname, router]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (useBuilderStore.getState().isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return <>{children}</>;
};

export default BuilderShell;
