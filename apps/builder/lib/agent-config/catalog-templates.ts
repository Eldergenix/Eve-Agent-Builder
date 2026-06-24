import { getIntegrationEntry } from "@vercel/eve-catalog";

type AuthSpec = { kind: "connect"; connector: string } | { kind: "none" };

const CONNECTION_AUTH: Record<string, AuthSpec> = {
  linear: { kind: "connect", connector: "linear" },
  notion: { kind: "connect", connector: "notion" },
  datadog: { kind: "connect", connector: "datadog" },
  honeycomb: { kind: "connect", connector: "honeycomb" },
};

function authBlock(auth: AuthSpec): string {
  if (auth.kind === "connect") {
    return `  auth: connect("${auth.connector}"),\n`;
  }
  return "";
}

function mcpConnectionTemplate(
  slug: string,
  url: string,
  description: string,
  auth: AuthSpec,
): string {
  const imports =
    auth.kind === "connect"
      ? `import { connect } from "@vercel/connect/eve";\nimport { defineMcpClientConnection } from "eve/connections";\n`
      : `import { defineMcpClientConnection } from "eve/connections";\n`;
  return `${imports}
export default defineMcpClientConnection({
  url: ${JSON.stringify(url)},
  description: ${JSON.stringify(description)},
${authBlock(auth)}});
`;
}

function openapiConnectionTemplate(
  slug: string,
  spec: string,
  baseUrl: string,
  description: string,
  auth: AuthSpec,
): string {
  const imports =
    auth.kind === "connect"
      ? `import { connect } from "@vercel/connect/eve";\nimport { defineOpenAPIConnection } from "eve/connections";\n`
      : `import { defineOpenAPIConnection } from "eve/connections";\n`;
  return `${imports}
export default defineOpenAPIConnection({
  spec: ${JSON.stringify(spec)},
  baseUrl: ${JSON.stringify(baseUrl)},
  description: ${JSON.stringify(description)},
${authBlock(auth)}});
`;
}

/** Generates a connection module from the eve integration catalog. */
export function connectionFileForSlug(slug: string): string | null {
  const entry = getIntegrationEntry(slug);
  if (!entry?.connection) return null;

  const auth = CONNECTION_AUTH[slug] ?? { kind: "none" };
  const description = entry.connection.description;

  if (entry.connection.mcp) {
    return mcpConnectionTemplate(slug, entry.connection.mcp.url, description, auth);
  }

  if (entry.connection.openapi) {
    return openapiConnectionTemplate(
      slug,
      entry.connection.openapi.spec,
      entry.connection.openapi.baseUrl,
      description,
      auth,
    );
  }

  return null;
}

function slackChannelTemplate(projectName: string): string {
  const connectorUid = `slack/${projectName.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "my-agent"}`;
  return `import { connectSlackCredentials } from "@vercel/connect/eve";
import { slackChannel } from "eve/channels/slack";

export default slackChannel({
  credentials: connectSlackCredentials(${JSON.stringify(connectorUid)}),
});
`;
}

function eveChannelTemplate(): string {
  return `import { eveChannel } from "eve/channels";

export default eveChannel();
`;
}

/** Generates a channel module from the eve integration catalog. */
export function channelFileForSlug(slug: string, projectName: string): string {
  if (slug === "eve") return eveChannelTemplate();
  if (slug === "slack") return slackChannelTemplate(projectName);
  const entry = getIntegrationEntry(slug);
  const label = entry?.name ?? slug;
  return `// Configure ${label} — see https://beta.eve.dev/docs/channels/${slug}\n`;
}
