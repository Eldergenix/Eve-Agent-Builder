import { NextResponse } from "next/server";

import { deploymentConfigUrl } from "@/lib/agent-config/deployment-config-url";
import { prepareDeployment } from "@/lib/agent-config/deployment";
import { normalizeAgentProjectConfig } from "@/lib/agent-config/defaults";

export async function POST(request: Request) {
  const config = normalizeAgentProjectConfig(await request.json());
  const templateRepositoryUrl =
    process.env.NEXT_PUBLIC_EVE_AGENT_TEMPLATE_REPOSITORY_URL?.trim() || null;
  const railwayTemplateUrl = process.env.NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL?.trim() || null;
  const configuredConfigUrl = process.env.NEXT_PUBLIC_EVE_AGENT_CONFIG_URL?.trim() || null;
  const configurationUrl = templateRepositoryUrl
    ? deploymentConfigUrl(config, new URL(request.url).origin)
    : configuredConfigUrl;

  return NextResponse.json(
    prepareDeployment(config, {
      templateRepositoryUrl,
      configurationUrl,
      railwayTemplateUrl,
    }),
  );
}
