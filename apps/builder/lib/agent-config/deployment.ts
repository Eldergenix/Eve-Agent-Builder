import {
  normalizeAgentProjectConfig,
  type AgentProjectConfig,
  type DeploymentTarget,
} from "@/lib/agent-config/defaults";

export type DeploymentSourceKind = "user-repository" | "service-template" | "placeholder";

export type DeploymentStatus =
  | "ready"
  | "needs-repository"
  | "needs-template-configuration"
  | "manual";

export type DeploymentSourceOptions = {
  templateRepositoryUrl?: string | null;
  configurationUrl?: string | null;
  railwayTemplateUrl?: string | null;
};

export type DeploymentSource = {
  kind: DeploymentSourceKind;
  repositoryUrl: string;
  configurationUrl: string | null;
};

export type DeploymentAction = {
  target: DeploymentTarget;
  label: string;
  url: string | null;
  buttonMarkdown: string | null;
  buttonHtml: string | null;
  requiredEnvironment: string[];
  environmentVariables: DeploymentEnvironmentVariable[];
  steps: string[];
};

export type DeploymentEnvironmentVariable = {
  key: string;
  category: "model" | "template" | "observability" | "database" | "cache";
  description: string;
  secret: boolean;
};

export type DeploymentManifest = {
  version: 1;
  appName: string;
  target: DeploymentTarget;
  repositoryUrl: string | null;
  source: DeploymentSource;
  oneClickUrls: {
    vercel: string;
    cloudflare: string;
    railway: string;
  };
  deploymentActions: Record<DeploymentTarget, DeploymentAction>;
  requiredEnvironment: string[];
  environmentVariables: DeploymentEnvironmentVariable[];
  observability: AgentProjectConfig["observabilityProvider"];
  services: AgentProjectConfig["serviceProviders"];
  generatedScope: "standalone-agent-app";
};

export type DeploymentPreparation = DeploymentManifest & {
  status: DeploymentStatus;
  launchUrl: string | null;
  platformUrl: string | null;
  zipRequired: boolean;
  configurationEnvironmentKey: "EVE_AGENT_CONFIG_URL" | null;
  configurationEnvironmentValue: string | null;
  notes: string[];
};

function defaultDeploymentSourceOptions(): DeploymentSourceOptions {
  return {
    templateRepositoryUrl:
      process.env.NEXT_PUBLIC_EVE_AGENT_TEMPLATE_REPOSITORY_URL?.trim() || null,
    configurationUrl: process.env.NEXT_PUBLIC_EVE_AGENT_CONFIG_URL?.trim() || null,
    railwayTemplateUrl: process.env.NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL?.trim() || null,
  };
}

function sourceOptions(options?: DeploymentSourceOptions): DeploymentSourceOptions {
  const defaults = defaultDeploymentSourceOptions();
  return {
    templateRepositoryUrl: options?.templateRepositoryUrl?.trim() || defaults.templateRepositoryUrl,
    configurationUrl: options?.configurationUrl?.trim() || defaults.configurationUrl,
    railwayTemplateUrl: options?.railwayTemplateUrl?.trim() || defaults.railwayTemplateUrl,
  };
}

export function resolveDeploymentSource(
  config: AgentProjectConfig,
  options?: DeploymentSourceOptions,
): DeploymentSource {
  const normalized = normalizeAgentProjectConfig(config);

  if (normalized.repositoryUrl.trim()) {
    return {
      kind: "user-repository",
      repositoryUrl: normalized.repositoryUrl.trim(),
      configurationUrl: null,
    };
  }

  const resolved = sourceOptions(options);
  if (resolved.templateRepositoryUrl) {
    return {
      kind: "service-template",
      repositoryUrl: resolved.templateRepositoryUrl,
      configurationUrl: resolved.configurationUrl ?? null,
    };
  }

  return {
    kind: "placeholder",
    repositoryUrl: "YOUR_PUBLIC_GIT_REPO_URL",
    configurationUrl: null,
  };
}

export function requiredEnvironmentKeys(
  config: AgentProjectConfig,
  options?: DeploymentSourceOptions,
): string[] {
  const normalized = normalizeAgentProjectConfig(config);
  const keys = ["AI_GATEWAY_API_KEY"];
  const source = resolveDeploymentSource(normalized, options);

  if (source.kind === "service-template") {
    keys.push("EVE_AGENT_CONFIG_URL");
  }

  if (normalized.observabilityProvider === "braintrust") {
    keys.push("BRAINTRUST_API_KEY");
  } else if (normalized.observabilityProvider === "langfuse") {
    keys.push("LANGFUSE_SECRET_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_BASE_URL");
  }

  if (normalized.serviceProviders.includes("supabase")) {
    keys.push(
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (normalized.serviceProviders.includes("upstash")) {
    keys.push("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN");
  }

  return keys;
}

function environmentVariableForKey(key: string): DeploymentEnvironmentVariable {
  if (key === "EVE_AGENT_CONFIG_URL") {
    return {
      key,
      category: "template",
      description: "Generated agent configuration URL from the hosted builder.",
      secret: false,
    };
  }

  if (key === "AI_GATEWAY_API_KEY") {
    return {
      key,
      category: "model",
      description: "Model gateway key used by the deployed agent runtime.",
      secret: true,
    };
  }

  if (key.startsWith("BRAINTRUST_")) {
    return {
      key,
      category: "observability",
      description: "Braintrust credential for traces, evals, or prompt management.",
      secret: key.endsWith("_API_KEY"),
    };
  }

  if (key.startsWith("LANGFUSE_")) {
    return {
      key,
      category: "observability",
      description: "Langfuse credential for traces, evals, or prompt management.",
      secret: key.includes("SECRET"),
    };
  }

  if (key.startsWith("NEXT_PUBLIC_SUPABASE_") || key === "SUPABASE_SERVICE_ROLE_KEY") {
    return {
      key,
      category: "database",
      description: "Supabase project credential for the generated agent app.",
      secret: key === "SUPABASE_SERVICE_ROLE_KEY",
    };
  }

  if (key.startsWith("UPSTASH_")) {
    return {
      key,
      category: "cache",
      description: "Upstash Redis REST credential for the generated agent app.",
      secret: true,
    };
  }

  return {
    key,
    category: "model",
    description: "Deployment environment variable.",
    secret: true,
  };
}

export function environmentVariablesForDeployment(
  config: AgentProjectConfig,
  options?: DeploymentSourceOptions,
): DeploymentEnvironmentVariable[] {
  const normalized = normalizeAgentProjectConfig(config);
  return requiredEnvironmentKeys(normalized, options).map(environmentVariableForKey);
}

export function publicRepositoryUrl(config: AgentProjectConfig): string {
  const normalized = normalizeAgentProjectConfig(config);
  return resolveDeploymentSource(normalized).repositoryUrl;
}

export function deploymentUrlForTarget(
  config: AgentProjectConfig,
  target: DeploymentTarget,
  options?: DeploymentSourceOptions,
): string | null {
  const normalized = normalizeAgentProjectConfig(config);
  const source = resolveDeploymentSource(normalized, options);

  if (target === "vercel") {
    const params = new URLSearchParams({
      "repository-url": source.repositoryUrl,
      "project-name": normalized.name,
      "repository-name": normalized.name,
      env: requiredEnvironmentKeys(normalized, options).join(","),
    });
    if (source.configurationUrl) params.set("EVE_AGENT_CONFIG_URL", source.configurationUrl);
    return `https://vercel.com/new/clone?${params.toString()}`;
  }

  if (target === "cloudflare") {
    return `https://deploy.workers.cloudflare.com/?url=${encodeURIComponent(source.repositoryUrl)}`;
  }

  if (target === "railway") {
    const resolved = sourceOptions(options);
    return resolved.railwayTemplateUrl || "https://railway.com/new";
  }

  return null;
}

export function deploymentPlatformUrl(target: DeploymentTarget): string | null {
  if (target === "vercel") return "https://vercel.com/new";
  if (target === "cloudflare") return "https://deploy.workers.cloudflare.com/";
  if (target === "railway") return "https://railway.com/new";
  return null;
}

function deploymentActionForTarget(
  config: AgentProjectConfig,
  target: DeploymentTarget,
  options?: DeploymentSourceOptions,
): DeploymentAction {
  const normalized = normalizeAgentProjectConfig(config);
  const source = resolveDeploymentSource(normalized, options);
  const url = deploymentUrlForTarget(normalized, target, options);
  const requiredEnvironment = requiredEnvironmentKeys(normalized, options);
  const environmentVariables = environmentVariablesForDeployment(normalized, options);

  if (target === "vercel") {
    return {
      target,
      label: "Deploy with Vercel",
      url,
      buttonMarkdown: url ? `[![Deploy with Vercel](https://vercel.com/button)](${url})` : null,
      buttonHtml: url
        ? `<a href="${url}"><img src="https://vercel.com/button" alt="Deploy with Vercel"/></a>`
        : null,
      requiredEnvironment,
      environmentVariables,
      steps: [
        "Click Deploy with Vercel.",
        source.kind === "service-template"
          ? source.configurationUrl
            ? "Confirm EVE_AGENT_CONFIG_URL is prefilled in the project creation flow."
            : "Deploy preparation must supply EVE_AGENT_CONFIG_URL before launch."
          : "Connect or clone the standalone agent repository.",
        "Fill the listed model, observability, database, and cache keys.",
        "Deploy, then open the generated chat frontend.",
      ],
    };
  }

  if (target === "cloudflare") {
    return {
      target,
      label: "Deploy to Cloudflare",
      url,
      buttonMarkdown: url
        ? `[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](${url})`
        : null,
      buttonHtml: url
        ? `<a href="${url}"><img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare"/></a>`
        : null,
      requiredEnvironment,
      environmentVariables,
      steps: [
        "Click Deploy to Cloudflare.",
        source.kind === "service-template"
          ? "Paste EVE_AGENT_CONFIG_URL when Cloudflare asks for variables."
          : "Let Cloudflare clone the standalone agent repository.",
        "Confirm generated Worker and resource names.",
        "Fill the listed Worker secrets.",
        "Deploy, then open the generated chat frontend.",
      ],
    };
  }

  if (target === "railway") {
    return {
      target,
      label: "Deploy on Railway",
      url,
      buttonMarkdown: url ? `[Deploy on Railway](${url})` : null,
      buttonHtml: url ? `<a href="${url}">Deploy on Railway</a>` : null,
      requiredEnvironment,
      environmentVariables,
      steps: [
        "Open the Railway deployment flow.",
        source.kind === "service-template"
          ? "Paste EVE_AGENT_CONFIG_URL when Railway asks for variables."
          : "Import the standalone agent repository.",
        "Fill the listed model, observability, database, and cache variables.",
        "Deploy with the generated railway.json configuration.",
        "Open the generated chat frontend.",
      ],
    };
  }

  if (target === "docker") {
    return {
      target,
      label: "Run with Docker",
      url: null,
      buttonMarkdown: null,
      buttonHtml: null,
      requiredEnvironment,
      environmentVariables,
      steps: [
        "Download and unzip the standalone agent project.",
        "Copy .env.example to .env.local and fill the listed keys.",
        "Run docker compose up --build.",
        "Open http://localhost:3000 to use the chat frontend.",
      ],
    };
  }

  return {
    target,
    label: "Run locally",
    url: null,
    buttonMarkdown: null,
    buttonHtml: null,
    requiredEnvironment,
    environmentVariables,
    steps: [
      "Download and unzip the standalone agent project.",
      "Copy .env.example to .env.local and fill the listed keys.",
      "Run pnpm install and pnpm dev.",
      "Open the local chat frontend.",
    ],
  };
}

export function deploymentActions(
  config: AgentProjectConfig,
  options?: DeploymentSourceOptions,
): Record<DeploymentTarget, DeploymentAction> {
  const normalized = normalizeAgentProjectConfig(config);

  return {
    vercel: deploymentActionForTarget(normalized, "vercel", options),
    cloudflare: deploymentActionForTarget(normalized, "cloudflare", options),
    railway: deploymentActionForTarget(normalized, "railway", options),
    docker: deploymentActionForTarget(normalized, "docker", options),
    local: deploymentActionForTarget(normalized, "local", options),
  };
}

export function deploymentManifest(
  config: AgentProjectConfig,
  options?: DeploymentSourceOptions,
): DeploymentManifest {
  const normalized = normalizeAgentProjectConfig(config);
  const source = resolveDeploymentSource(normalized, options);

  return {
    version: 1,
    appName: normalized.name,
    target: normalized.deployMode,
    repositoryUrl: normalized.repositoryUrl.trim() || null,
    source,
    oneClickUrls: {
      vercel: deploymentUrlForTarget(normalized, "vercel", options) ?? "",
      cloudflare: deploymentUrlForTarget(normalized, "cloudflare", options) ?? "",
      railway: deploymentUrlForTarget(normalized, "railway", options) ?? "",
    },
    deploymentActions: deploymentActions(normalized, options),
    requiredEnvironment: requiredEnvironmentKeys(normalized, options),
    environmentVariables: environmentVariablesForDeployment(normalized, options),
    observability: normalized.observabilityProvider,
    services: normalized.serviceProviders,
    generatedScope: "standalone-agent-app",
  };
}

export function prepareDeployment(
  config: AgentProjectConfig,
  options?: DeploymentSourceOptions,
): DeploymentPreparation {
  const normalized = normalizeAgentProjectConfig(config);
  const manifest = deploymentManifest(normalized, options);
  const source = manifest.source;
  const platformUrl = deploymentPlatformUrl(normalized.deployMode);
  const targetLaunchUrl = deploymentUrlForTarget(normalized, normalized.deployMode, options);
  const isHostedTarget =
    normalized.deployMode === "vercel" ||
    normalized.deployMode === "cloudflare" ||
    normalized.deployMode === "railway";
  const hasDeployableSource = source.kind === "user-repository";
  const hasTemplateConfiguration =
    source.kind === "service-template" && Boolean(source.configurationUrl);
  const hasOneClickTemplate = hasTemplateConfiguration && normalized.deployMode === "vercel";
  const hasRailwayTemplateUrl = Boolean(sourceOptions(options).railwayTemplateUrl);
  const hasPlatformTemplateFlow =
    (normalized.deployMode === "cloudflare" && hasTemplateConfiguration) ||
    (normalized.deployMode === "railway" && hasTemplateConfiguration && hasRailwayTemplateUrl);
  const status: DeploymentStatus = isHostedTarget
    ? hasDeployableSource || hasOneClickTemplate
      ? "ready"
      : source.kind === "service-template"
        ? "needs-template-configuration"
        : "needs-repository"
    : "manual";
  const launchUrl = status === "ready" || hasPlatformTemplateFlow ? targetLaunchUrl : platformUrl;
  const notes =
    status === "needs-repository"
      ? [
          "Publish the exported standalone app to a public GitHub or GitLab repository before using the platform deploy button.",
        ]
      : status === "needs-template-configuration"
        ? source.configurationUrl
          ? normalized.deployMode === "railway" && !hasRailwayTemplateUrl
            ? [
                "A service-owned deployment template is configured. Publish it as a Railway template and set NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL before Railway can launch this agent without a user repository.",
              ]
            : [
                "A service-owned deployment template is configured. This platform cannot prefill EVE_AGENT_CONFIG_URL from its deploy URL, so paste the generated value when the platform asks for variables.",
              ]
          : [
              "A service-owned deployment template is configured, but this deployment still needs a hosted agent configuration URL before it can be completed without a user repository.",
            ]
        : status === "manual"
          ? [
              "Use the generated Dockerfile, compose.yaml, and .env.example locally or in your container platform.",
            ]
          : ["Deployment can continue directly in the selected platform."];

  return {
    ...manifest,
    status,
    launchUrl,
    platformUrl,
    zipRequired: status !== "ready" && !hasPlatformTemplateFlow,
    configurationEnvironmentKey: source.configurationUrl ? "EVE_AGENT_CONFIG_URL" : null,
    configurationEnvironmentValue: source.configurationUrl,
    notes,
  };
}
