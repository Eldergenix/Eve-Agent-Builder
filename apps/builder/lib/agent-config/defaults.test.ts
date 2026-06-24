import { describe, expect, it } from "vitest";

import {
  createDefaultProject,
  normalizeAgentProjectConfig,
  productionStackForPreset,
  productionStackPresetForConfig,
} from "@/lib/agent-config/defaults";

describe("production stack presets", () => {
  it("builds a portable production stack for hosted and container targets", () => {
    expect(productionStackForPreset("portable-production", "vercel")).toEqual({
      observabilityProvider: "langfuse",
      serviceProviders: ["supabase", "upstash"],
    });

    expect(productionStackForPreset("portable-production", "docker")).toEqual({
      observabilityProvider: "langfuse",
      serviceProviders: ["supabase", "upstash"],
    });
  });

  it("builds Cloudflare-native stacks only for Cloudflare deployments", () => {
    expect(productionStackForPreset("cloudflare-native", "vercel")).toBeNull();
    expect(productionStackForPreset("cloudflare-native", "cloudflare")).toEqual({
      observabilityProvider: "langfuse",
      serviceProviders: [
        "cloudflare-d1",
        "cloudflare-kv",
        "cloudflare-r2",
        "cloudflare-vectorize",
        "cloudflare-queues",
        "cloudflare-hyperdrive",
        "cloudflare-workers-ai",
        "cloudflare-browser",
        "cloudflare-analytics-engine",
        "cloudflare-images",
        "cloudflare-ai-search",
      ],
    });
  });

  it("detects matching presets from project configuration", () => {
    expect(productionStackPresetForConfig(createDefaultProject())).toBe("minimal");
    expect(
      productionStackPresetForConfig({
        ...createDefaultProject(),
        deployMode: "vercel",
        observabilityProvider: "langfuse",
        serviceProviders: ["upstash", "supabase"],
      }),
    ).toBe("portable-production");
    expect(
      productionStackPresetForConfig({
        ...createDefaultProject(),
        deployMode: "cloudflare",
        observabilityProvider: "langfuse",
        serviceProviders: ["cloudflare-d1"],
      }),
    ).toBe("custom");
  });
});

describe("project config normalization", () => {
  it("filters target-specific service providers from imported or posted configs", () => {
    const config = normalizeAgentProjectConfig({
      ...createDefaultProject(),
      deployMode: "docker",
      serviceProviders: ["upstash", "cloudflare-d1", "cloudflare-workers-ai"],
    });

    expect(config.serviceProviders).toEqual(["upstash"]);
  });
});
