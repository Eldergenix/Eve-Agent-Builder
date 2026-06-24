import { describe, expect, it } from "vitest";

import {
  decodeDeploymentConfig,
  deploymentConfigPayload,
  deploymentConfigUrl,
  encodeDeploymentConfig,
} from "@/lib/agent-config/deployment-config-url";
import { createDefaultProject, type AgentProjectConfig } from "@/lib/agent-config/defaults";

describe("deployment config URL", () => {
  it("round-trips a standalone agent config payload", () => {
    const config: AgentProjectConfig = {
      ...createDefaultProject(),
      name: "customer-agent",
      instructions: "# Identity\n\nYou are deployed from a template.",
      serviceProviders: ["supabase", "upstash"],
    };

    const encoded = encodeDeploymentConfig(config);
    const decoded = decodeDeploymentConfig(encoded);

    expect(decoded.generatedScope).toBe("standalone-agent-config");
    expect(decoded.config.name).toBe("customer-agent");
    expect(decoded.config.instructions).toContain("deployed from a template");
    expect(decoded.config.serviceProviders).toEqual(["supabase", "upstash"]);
  });

  it("builds an absolute API URL for template deployments", () => {
    const url = deploymentConfigUrl(createDefaultProject(), "https://builder.example.com");

    expect(url).toContain("https://builder.example.com/api/deploy/config?payload=");
    expect(url).not.toContain("agent-builder");
  });

  it("normalizes target-specific services in hosted template payloads", () => {
    const encoded = encodeDeploymentConfig({
      ...createDefaultProject(),
      deployMode: "docker",
      serviceProviders: ["upstash", "cloudflare-d1"],
    });

    expect(decodeDeploymentConfig(encoded).config.serviceProviders).toEqual(["upstash"]);
  });

  it("omits capability entries that do not affect materialized files", () => {
    const config = createDefaultProject();
    const payload = deploymentConfigPayload(config);
    const fullPayloadJson = JSON.stringify({
      version: 1,
      generatedScope: "standalone-agent-config",
      config,
    });

    expect(payload.config.capabilities.length).toBeLessThan(config.capabilities.length);
    expect(payload.config.capabilities.some((item) => item.kind === "framework-tool")).toBe(false);
    expect(payload.config.capabilities).toContainEqual(
      expect.objectContaining({ kind: "tool", name: "get_weather", enabled: true }),
    );
    expect(payload.config.capabilities.every((item) => item.enabled)).toBe(true);
    expect(JSON.stringify(payload).length).toBeLessThan(fullPayloadJson.length / 2);
    expect(deploymentConfigUrl(config, "https://builder.example.com").length).toBeLessThan(4000);
  });

  it("keeps disabled framework-tool overrides in compact hosted payloads", () => {
    const config = createDefaultProject();
    const decoded = decodeDeploymentConfig(
      encodeDeploymentConfig({
        ...config,
        capabilities: config.capabilities.map((item) =>
          item.kind === "framework-tool" && item.name === "bash"
            ? { ...item, enabled: false }
            : item,
        ),
      }),
    );

    expect(decoded.config.capabilities).toContainEqual(
      expect.objectContaining({ kind: "framework-tool", name: "bash", enabled: false }),
    );
    expect(decoded.config.capabilities).not.toContainEqual(
      expect.objectContaining({ kind: "framework-tool", name: "readFile", enabled: true }),
    );
  });
});
