export const AI_GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

export type GatewayCatalogModel = {
  id: string;
  name: string;
  type: string;
  owned_by: string;
  tags?: readonly string[];
};

export type GatewayModelOption = {
  id: string;
  label: string;
  provider: string;
  providerKey: string;
  featured?: boolean;
};

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

const POPULAR_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "meta",
  "mistral",
  "xai",
  "deepseek",
] as const;

const FEATURED_MODEL_IDS = [
  DEFAULT_MODEL,
  "anthropic/claude-opus-4.8",
  "openai/gpt-5.5",
  "google/gemini-2.5-pro",
] as const;

export const FALLBACK_MODEL_OPTIONS: GatewayModelOption[] = [
  {
    id: DEFAULT_MODEL,
    label: "Claude Sonnet 4.6",
    provider: "Anthropic",
    providerKey: "anthropic",
    featured: true,
  },
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    providerKey: "anthropic",
    featured: true,
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    provider: "OpenAI",
    providerKey: "openai",
    featured: true,
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "Google",
    providerKey: "google",
    featured: true,
  },
  { id: "google/gemini-3.5", label: "Gemini 3.5", provider: "Google", providerKey: "google" },
  {
    id: "meta/llama-4-maverick",
    label: "Llama 4 Maverick",
    provider: "Meta",
    providerKey: "meta",
  },
  {
    id: "mistral/mistral-large",
    label: "Mistral Large",
    provider: "Mistral",
    providerKey: "mistral",
  },
  { id: "xai/grok-3", label: "Grok 3", provider: "xAI", providerKey: "xai" },
  {
    id: "deepseek/deepseek-v3.2",
    label: "DeepSeek V3.2",
    provider: "DeepSeek",
    providerKey: "deepseek",
  },
];

export type GatewayProviderOption = {
  id: string;
  label: string;
  modelId: string;
  modelLabel: string;
};

function providerLabel(provider: string): string {
  if (provider.length === 0) return "";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function providerKeyFromModelId(modelId: string): string {
  return modelId.split("/")[0]?.trim().toLowerCase() ?? "";
}

function normalizeModelKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function modelRouteKey(modelId: string): string {
  const route = modelId.split("/").slice(1).join("/");
  return normalizeModelKey(route || modelId);
}

function modelLabelKey(option: GatewayModelOption): string {
  return normalizeModelKey(option.label);
}

function providerPriority(provider: string): number {
  const index = POPULAR_PROVIDERS.indexOf(provider as (typeof POPULAR_PROVIDERS)[number]);
  return index === -1 ? POPULAR_PROVIDERS.length : index;
}

function featuredPriority(id: string): number {
  const index = FEATURED_MODEL_IDS.indexOf(id as (typeof FEATURED_MODEL_IDS)[number]);
  return index === -1 ? FEATURED_MODEL_IDS.length : index;
}

export async function fetchGatewayCatalog(signal?: AbortSignal): Promise<GatewayCatalogModel[]> {
  const response = await fetch(AI_GATEWAY_MODELS_URL, {
    signal,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`AI Gateway models request failed (${response.status})`);
  }

  const json = (await response.json()) as { data?: GatewayCatalogModel[] };
  if (!Array.isArray(json.data)) {
    throw new Error("AI Gateway models response was malformed");
  }

  return json.data;
}

/** Language models from the AI Gateway catalog, sorted with featured picks first. */
export function buildGatewayModelOptions(catalog: GatewayCatalogModel[]): GatewayModelOption[] {
  const models = catalog
    .filter((model) => model.type === "language")
    .map((model) => {
      const provider = model.id.split("/")[0] ?? model.owned_by;
      return {
        id: model.id,
        label: model.name,
        provider: providerLabel(provider),
        providerKey: provider,
      };
    })
    .sort((a, b) => {
      const featuredDiff = featuredPriority(a.id) - featuredPriority(b.id);
      if (featuredDiff !== 0) return featuredDiff;

      const priorityDiff = providerPriority(a.providerKey) - providerPriority(b.providerKey);
      if (priorityDiff !== 0) return priorityDiff;

      const providerDiff = a.providerKey.localeCompare(b.providerKey);
      if (providerDiff !== 0) return providerDiff;

      return a.label.localeCompare(b.label);
    });

  if (models.length === 0) return FALLBACK_MODEL_OPTIONS;

  return models.map(({ id, label, provider }) => ({
    id,
    label,
    provider,
    providerKey: providerKeyFromModelId(id),
    featured: FEATURED_MODEL_IDS.includes(id as (typeof FEATURED_MODEL_IDS)[number]) || undefined,
  }));
}

export function filterGatewayModelOptions(
  options: GatewayModelOption[],
  query: string,
): GatewayModelOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;

  return options.filter((option) => {
    const haystack = `${option.id} ${option.label} ${option.provider}`.toLowerCase();
    return haystack.includes(normalized);
  });
}

export function resolveGatewayModelOption(
  options: GatewayModelOption[],
  modelId: string,
): GatewayModelOption {
  const match = options.find((option) => option.id === modelId);
  if (match) return match;

  const provider = modelId.split("/")[0] ?? "";
  return {
    id: modelId,
    label: modelId,
    provider: providerLabel(provider),
    providerKey: providerKeyFromModelId(modelId),
  };
}

export function mergeGatewayModelOptions(
  options: GatewayModelOption[],
  selectedId: string,
): GatewayModelOption[] {
  if (options.some((option) => option.id === selectedId)) return options;
  return [resolveGatewayModelOption(options, selectedId), ...options];
}

export function buildGatewayProviderOptions(
  options: GatewayModelOption[],
  modelId: string,
): GatewayProviderOption[] {
  const mergedOptions = mergeGatewayModelOptions(options, modelId);
  const selected = resolveGatewayModelOption(mergedOptions, modelId);
  const selectedRouteKey = modelRouteKey(selected.id);
  const selectedLabelKey = modelLabelKey(selected);
  const providers = new Map<string, GatewayProviderOption>();

  function addProvider(option: GatewayModelOption) {
    providers.set(option.providerKey, {
      id: option.providerKey,
      label: option.provider,
      modelId: option.id,
      modelLabel: option.label,
    });
  }

  for (const option of mergedOptions) {
    if (modelRouteKey(option.id) !== selectedRouteKey) continue;
    addProvider(option);
  }

  for (const option of mergedOptions) {
    if (providers.has(option.providerKey)) continue;
    if (option.providerKey === selected.providerKey) continue;
    if (modelLabelKey(option) !== selectedLabelKey) continue;
    addProvider(option);
  }

  if (providers.size === 0) {
    addProvider(selected);
  }

  return [...providers.values()];
}

export function resolveGatewayProviderOption(
  options: GatewayProviderOption[],
  modelId: string,
): GatewayProviderOption {
  const selectedProvider = providerKeyFromModelId(modelId);
  const match = options.find((option) => option.id === selectedProvider);
  if (match) return match;

  const provider = providerLabel(selectedProvider);
  return {
    id: selectedProvider,
    label: provider,
    modelId,
    modelLabel: modelId,
  };
}
