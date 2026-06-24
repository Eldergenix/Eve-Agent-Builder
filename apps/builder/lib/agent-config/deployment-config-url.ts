import { deflateRawSync, inflateRawSync } from "node:zlib";

import { normalizeAgentProjectConfig, type AgentProjectConfig } from "@/lib/agent-config/defaults";
import type { CapabilityItem } from "@/types";

const DEPLOYMENT_CONFIG_VERSION = 1;

export type DeploymentConfigPayload = {
  version: typeof DEPLOYMENT_CONFIG_VERSION;
  generatedScope: "standalone-agent-config";
  config: AgentProjectConfig;
};

function capabilityAffectsMaterializedFiles(capability: CapabilityItem): boolean {
  if (capability.kind === "framework-tool") return capability.enabled === false;
  return capability.enabled;
}

function compactDeploymentConfig(config: AgentProjectConfig): AgentProjectConfig {
  return {
    ...config,
    capabilities: config.capabilities.filter(capabilityAffectsMaterializedFiles),
  };
}

export function deploymentConfigPayload(config: AgentProjectConfig): DeploymentConfigPayload {
  return {
    version: DEPLOYMENT_CONFIG_VERSION,
    generatedScope: "standalone-agent-config",
    config: compactDeploymentConfig(normalizeAgentProjectConfig(config)),
  };
}

export function encodeDeploymentConfig(config: AgentProjectConfig): string {
  const json = JSON.stringify(deploymentConfigPayload(config));
  return deflateRawSync(json).toString("base64url");
}

export function decodeDeploymentConfig(payload: string): DeploymentConfigPayload {
  const json = inflateRawSync(Buffer.from(payload, "base64url")).toString("utf8");
  const parsed = JSON.parse(json) as DeploymentConfigPayload;
  if (
    parsed.version !== DEPLOYMENT_CONFIG_VERSION ||
    parsed.generatedScope !== "standalone-agent-config" ||
    !parsed.config ||
    typeof parsed.config !== "object"
  ) {
    throw new Error("Invalid deployment config payload.");
  }
  return {
    ...parsed,
    config: normalizeAgentProjectConfig(parsed.config),
  };
}

export function deploymentConfigUrl(config: AgentProjectConfig, origin: string): string {
  const url = new URL("/api/deploy/config", origin);
  url.searchParams.set("payload", encodeDeploymentConfig(config));
  return url.toString();
}
