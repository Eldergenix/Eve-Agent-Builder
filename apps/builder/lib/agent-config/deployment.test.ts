import { describe, expect, it } from "vitest";

import { deploymentManifest, prepareDeployment } from "@/lib/agent-config/deployment";
import { createDefaultProject, type AgentProjectConfig } from "@/lib/agent-config/defaults";

describe("deployment preparation", () => {
  it("prepares a Vercel one-click launch with required provider env keys", () => {
    const config: AgentProjectConfig = {
      ...createDefaultProject(),
      repositoryUrl: "https://github.com/acme/agent",
      deployMode: "vercel",
      observabilityProvider: "langfuse",
      serviceProviders: ["supabase", "upstash"],
    };

    const prepared = prepareDeployment(config);

    expect(prepared.status).toBe("ready");
    expect(prepared.zipRequired).toBe(false);
    expect(prepared.launchUrl).toContain("https://vercel.com/new/clone?");
    expect(prepared.launchUrl).toContain("repository-url=https%3A%2F%2Fgithub.com%2Facme%2Fagent");
    expect(prepared.deploymentActions.vercel.buttonMarkdown).toContain("Deploy with Vercel");
    expect(prepared.deploymentActions.vercel.steps).toContain(
      "Fill the listed model, observability, database, and cache keys.",
    );
    expect(prepared.environmentVariables).toContainEqual(
      expect.objectContaining({
        key: "LANGFUSE_SECRET_KEY",
        category: "observability",
        secret: true,
      }),
    );
    expect(prepared.deploymentActions.vercel.environmentVariables).toContainEqual(
      expect.objectContaining({
        key: "SUPABASE_SERVICE_ROLE_KEY",
        category: "database",
        secret: true,
      }),
    );
    expect(prepared.requiredEnvironment).toEqual([
      "AI_GATEWAY_API_KEY",
      "LANGFUSE_SECRET_KEY",
      "LANGFUSE_PUBLIC_KEY",
      "LANGFUSE_BASE_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]);
  });

  it("marks Cloudflare one-click deployment as needing a public repository first", () => {
    const prepared = prepareDeployment({
      ...createDefaultProject(),
      deployMode: "cloudflare",
    });

    expect(prepared.status).toBe("needs-repository");
    expect(prepared.launchUrl).toBe("https://deploy.workers.cloudflare.com/");
    expect(prepared.oneClickUrls.cloudflare).toContain("YOUR_PUBLIC_GIT_REPO_URL");
    expect(prepared.notes[0]).toContain("public GitHub or GitLab repository");
  });

  it("uses a service-owned template repo when configured", () => {
    const prepared = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "vercel",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
        configurationUrl: "https://builder.example.com/config/my-eve-agent.json",
      },
    );

    expect(prepared.status).toBe("ready");
    expect(prepared.zipRequired).toBe(false);
    expect(prepared.source.kind).toBe("service-template");
    expect(prepared.launchUrl).toContain(
      "repository-url=https%3A%2F%2Fgithub.com%2Feve%2Fagent-runtime-template",
    );
    expect(prepared.launchUrl).toContain(
      "EVE_AGENT_CONFIG_URL=https%3A%2F%2Fbuilder.example.com%2Fconfig%2Fmy-eve-agent.json",
    );
    expect(prepared.requiredEnvironment).toContain("EVE_AGENT_CONFIG_URL");
    expect(prepared.environmentVariables).toContainEqual(
      expect.objectContaining({
        key: "EVE_AGENT_CONFIG_URL",
        category: "template",
        secret: false,
      }),
    );
    expect(prepared.configurationEnvironmentKey).toBe("EVE_AGENT_CONFIG_URL");
    expect(prepared.configurationEnvironmentValue).toBe(
      "https://builder.example.com/config/my-eve-agent.json",
    );
    expect(prepared.deploymentActions.vercel.steps).toContain(
      "Confirm EVE_AGENT_CONFIG_URL is prefilled in the project creation flow.",
    );
  });

  it("opens a Cloudflare template deploy flow and returns the config value to paste", () => {
    const prepared = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "cloudflare",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
        configurationUrl: "https://builder.example.com/config/cloudflare-agent.json",
      },
    );

    expect(prepared.status).toBe("needs-template-configuration");
    expect(prepared.zipRequired).toBe(false);
    expect(prepared.launchUrl).toBe(
      "https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Feve%2Fagent-runtime-template",
    );
    expect(prepared.deploymentActions.cloudflare.buttonMarkdown).toContain("Deploy to Cloudflare");
    expect(prepared.deploymentActions.cloudflare.steps).toContain(
      "Paste EVE_AGENT_CONFIG_URL when Cloudflare asks for variables.",
    );
    expect(prepared.configurationEnvironmentKey).toBe("EVE_AGENT_CONFIG_URL");
    expect(prepared.configurationEnvironmentValue).toBe(
      "https://builder.example.com/config/cloudflare-agent.json",
    );
    expect(prepared.notes[0]).toContain("paste the generated value");
  });

  it("requires a published Railway template URL before template launch", () => {
    const prepared = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "railway",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
        configurationUrl: "https://builder.example.com/config/railway-agent.json",
      },
    );

    expect(prepared.status).toBe("needs-template-configuration");
    expect(prepared.launchUrl).toBe("https://railway.com/new");
    expect(prepared.zipRequired).toBe(true);
    expect(prepared.notes[0]).toContain("NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL");
  });

  it("opens a Railway template URL when configured", () => {
    const prepared = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "railway",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
        configurationUrl: "https://builder.example.com/config/railway-agent.json",
        railwayTemplateUrl: "https://railway.com/template/eve-agent",
      },
    );

    expect(prepared.status).toBe("needs-template-configuration");
    expect(prepared.launchUrl).toBe("https://railway.com/template/eve-agent");
    expect(prepared.zipRequired).toBe(false);
    expect(prepared.notes[0]).toContain("paste the generated value");
  });

  it("requires a hosted config URL before template one-click deployment", () => {
    const prepared = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "vercel",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
      },
    );

    expect(prepared.status).toBe("needs-template-configuration");
    expect(prepared.launchUrl).toBe("https://vercel.com/new");
    expect(prepared.zipRequired).toBe(true);
    expect(prepared.requiredEnvironment).toContain("EVE_AGENT_CONFIG_URL");
    expect(prepared.deploymentActions.vercel.requiredEnvironment).toContain("EVE_AGENT_CONFIG_URL");
    expect(prepared.deploymentActions.vercel.steps).toContain(
      "Deploy preparation must supply EVE_AGENT_CONFIG_URL before launch.",
    );
    expect(prepared.notes[0]).toContain("hosted agent configuration URL");
  });

  it("marks Docker as a manual export path", () => {
    const prepared = prepareDeployment({
      ...createDefaultProject(),
      deployMode: "docker",
    });

    expect(prepared.status).toBe("manual");
    expect(prepared.launchUrl).toBeNull();
    expect(prepared.zipRequired).toBe(true);
    expect(prepared.deploymentActions.docker.url).toBeNull();
    expect(prepared.deploymentActions.docker.steps).toContain("Run docker compose up --build.");
  });

  it("emits the standalone app manifest shape", () => {
    const manifest = deploymentManifest({
      ...createDefaultProject(),
      repositoryUrl: "https://github.com/acme/agent",
    });

    expect(manifest.generatedScope).toBe("standalone-agent-app");
    expect(manifest.repositoryUrl).toBe("https://github.com/acme/agent");
    expect(manifest.source.kind).toBe("user-repository");
    expect(manifest.oneClickUrls.vercel).toContain("https://vercel.com/new/clone?");
    expect(manifest.deploymentActions.cloudflare.buttonHtml).toContain(
      "deploy.workers.cloudflare.com/button",
    );
  });

  it("filters target-specific services before emitting deployment manifests", () => {
    const manifest = deploymentManifest({
      ...createDefaultProject(),
      deployMode: "docker",
      serviceProviders: ["upstash", "cloudflare-d1", "cloudflare-workers-ai"],
    });

    expect(manifest.target).toBe("docker");
    expect(manifest.services).toEqual(["upstash"]);
    expect(manifest.requiredEnvironment).toEqual([
      "AI_GATEWAY_API_KEY",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ]);
    expect(manifest.deploymentActions.docker.requiredEnvironment).toEqual(
      manifest.requiredEnvironment,
    );
  });

  it("keeps Cloudflare-native services for Cloudflare deployment manifests", () => {
    const prepared = prepareDeployment({
      ...createDefaultProject(),
      deployMode: "cloudflare",
      serviceProviders: ["upstash", "cloudflare-d1", "cloudflare-workers-ai"],
    });

    expect(prepared.services).toEqual(["upstash", "cloudflare-d1", "cloudflare-workers-ai"]);
    expect(prepared.target).toBe("cloudflare");
  });
});
