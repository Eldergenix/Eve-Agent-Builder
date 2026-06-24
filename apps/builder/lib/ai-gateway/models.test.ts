import { describe, expect, it } from "vitest";

import {
  buildGatewayModelOptions,
  buildGatewayProviderOptions,
  filterGatewayModelOptions,
  mergeGatewayModelOptions,
  type GatewayCatalogModel,
} from "@/lib/ai-gateway/models";

const CATALOG: GatewayCatalogModel[] = [
  {
    id: "zai/glm-4.6",
    name: "GLM 4.6",
    type: "language",
    owned_by: "zai",
    tags: ["tool-use"],
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 mini",
    type: "language",
    owned_by: "openai",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    type: "language",
    owned_by: "anthropic",
  },
  {
    id: "bedrock/claude-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    type: "language",
    owned_by: "bedrock",
  },
  { id: "openai/dall-e-3", name: "DALL-E 3", type: "image", owned_by: "openai" },
];

describe("AI Gateway model options", () => {
  it("includes language models and sorts featured picks first", () => {
    const options = buildGatewayModelOptions(CATALOG);
    expect(options.map((option) => option.id)).toEqual([
      "anthropic/claude-sonnet-4.6",
      "openai/gpt-5-mini",
      "bedrock/claude-sonnet-4.6",
      "zai/glm-4.6",
    ]);
  });

  it("filters by provider, label, and id", () => {
    const options = buildGatewayModelOptions(CATALOG);
    expect(filterGatewayModelOptions(options, "glm").map((option) => option.id)).toEqual([
      "zai/glm-4.6",
    ]);
  });

  it("preserves a selected model that is not in the fetched catalog", () => {
    const options = buildGatewayModelOptions(CATALOG);
    const merged = mergeGatewayModelOptions(options, "custom/vendor-model");
    expect(merged[0]?.id).toBe("custom/vendor-model");
  });

  it("returns provider variants for the selected model family", () => {
    const options = buildGatewayModelOptions(CATALOG);
    const providers = buildGatewayProviderOptions(options, "anthropic/claude-sonnet-4.6");

    expect(providers).toEqual([
      {
        id: "anthropic",
        label: "Anthropic",
        modelId: "anthropic/claude-sonnet-4.6",
        modelLabel: "Claude Sonnet 4.6",
      },
      {
        id: "bedrock",
        label: "Bedrock",
        modelId: "bedrock/claude-sonnet-4.6",
        modelLabel: "Claude Sonnet 4.6",
      },
    ]);
  });

  it("does not let same-provider label collisions replace the selected model route", () => {
    const providers = buildGatewayProviderOptions(
      [
        {
          id: "openai/gpt-5.2",
          label: "GPT 5.2",
          provider: "OpenAI",
          providerKey: "openai",
        },
        {
          id: "openai/gpt-5.2-pro",
          label: "GPT 5.2",
          provider: "OpenAI",
          providerKey: "openai",
        },
        {
          id: "gateway/gpt-5.2",
          label: "GPT 5.2",
          provider: "Gateway",
          providerKey: "gateway",
        },
      ],
      "openai/gpt-5.2",
    );

    expect(providers).toEqual([
      {
        id: "openai",
        label: "OpenAI",
        modelId: "openai/gpt-5.2",
        modelLabel: "GPT 5.2",
      },
      {
        id: "gateway",
        label: "Gateway",
        modelId: "gateway/gpt-5.2",
        modelLabel: "GPT 5.2",
      },
    ]);
  });
});
