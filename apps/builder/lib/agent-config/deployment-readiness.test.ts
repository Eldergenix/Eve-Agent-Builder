import { describe, expect, it } from "vitest";

import {
  deploymentCtaLabel,
  deploymentLaunchStatusMessage,
  deploymentReadinessForTarget,
} from "@/lib/agent-config/deployment-readiness";
import { prepareDeployment } from "@/lib/agent-config/deployment";
import { createDefaultProject } from "@/lib/agent-config/defaults";

describe("deployment readiness", () => {
  it("does not promise Railway one-click launch until the Railway template URL is configured", () => {
    const readiness = deploymentReadinessForTarget({
      deployMode: "railway",
      repositoryUrl: "",
      managedTemplateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
    });

    expect(readiness).toMatchObject({
      sourceLabel: "Template setup required",
      statusLabel: "Export first",
      oneClickReady: false,
    });
    expect(readiness.detail).toContain("NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL");
    expect(deploymentCtaLabel("Deploy on Railway", "railway", readiness.oneClickReady)).toBe(
      "Deploy",
    );
  });

  it("marks Railway one-click ready when the managed Railway template URL exists", () => {
    const readiness = deploymentReadinessForTarget({
      deployMode: "railway",
      repositoryUrl: "",
      managedTemplateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
      managedRailwayTemplateUrl: "https://railway.com/template/eve-agent",
    });

    expect(readiness).toMatchObject({
      sourceLabel: "Managed template",
      statusLabel: "Ready",
      oneClickReady: true,
    });
    expect(deploymentCtaLabel("Deploy on Railway", "railway", readiness.oneClickReady)).toBe(
      "Deploy on Railway",
    );
  });

  it("treats Vercel and Cloudflare managed templates as one-click ready", () => {
    for (const deployMode of ["vercel", "cloudflare"] as const) {
      const readiness = deploymentReadinessForTarget({
        deployMode,
        repositoryUrl: "",
        managedTemplateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
      });

      expect(readiness.oneClickReady).toBe(true);
      expect(readiness.sourceLabel).toBe("Managed template");
    }
  });

  it("uses a deployment label for manual targets", () => {
    const readiness = deploymentReadinessForTarget({
      deployMode: "docker",
      repositoryUrl: "",
    });

    expect(readiness).toMatchObject({
      sourceLabel: "Docker export",
      statusLabel: "Manual",
      oneClickReady: false,
    });
    expect(deploymentCtaLabel("Run with Docker", "docker", readiness.oneClickReady)).toBe("Deploy");
    expect(deploymentCtaLabel("Run locally", "local", false)).toBe("Deploy");
  });

  it("uses selected platform labels when one-click deployment is ready", () => {
    expect(deploymentCtaLabel("Deploy with Vercel", "vercel", true)).toBe("Deploy with Vercel");
    expect(deploymentCtaLabel("Deploy to Cloudflare", "cloudflare", true)).toBe(
      "Deploy to Cloudflare",
    );
    expect(deploymentCtaLabel("Deploy on Railway", "railway", true)).toBe("Deploy on Railway");
  });

  it("reports exported Railway setup when the managed Railway template is not configured", () => {
    const deployment = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "railway",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
        configurationUrl: "https://builder.example.com/config/railway-agent.json",
      },
    );

    expect(deployment.zipRequired).toBe(true);
    expect(
      deploymentLaunchStatusMessage({
        deployment,
        hasLaunchUrl: true,
        copiedConfiguration: true,
        noLaunchMessage: "Project exported. Follow the generated deploy/one-click.md instructions.",
        exportedPrefix: "Project exported",
      }),
    ).toContain("NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL");
  });

  it("reports copied config for Cloudflare managed template launch", () => {
    const deployment = prepareDeployment(
      {
        ...createDefaultProject(),
        deployMode: "cloudflare",
      },
      {
        templateRepositoryUrl: "https://github.com/eve/agent-runtime-template",
        configurationUrl: "https://builder.example.com/config/cloudflare-agent.json",
      },
    );

    expect(deployment.zipRequired).toBe(false);
    expect(
      deploymentLaunchStatusMessage({
        deployment,
        hasLaunchUrl: true,
        copiedConfiguration: true,
        noLaunchMessage: "Project exported. Follow the generated deploy/one-click.md instructions.",
        exportedPrefix: "Project exported",
      }),
    ).toBe("Deployment flow opened. Paste the copied EVE_AGENT_CONFIG_URL when prompted.");
  });
});
