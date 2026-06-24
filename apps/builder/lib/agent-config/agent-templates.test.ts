import { describe, expect, it } from "vitest";

import { applyAgentTemplate, getAgentTemplate } from "@/lib/agent-config/agent-templates";
import { createDefaultProject } from "@/lib/agent-config/defaults";

describe("agent templates", () => {
  it("enables Linear connection and agent channel for the Linear template", () => {
    const config = applyAgentTemplate(createDefaultProject(), "linear");
    const enabled = config.capabilities.filter((item) => item.enabled).map((item) => item.id);

    expect(enabled).toContain("connection-linear");
    expect(enabled).toContain("channel-linear-agent");
    expect(config.instructions).toContain("**Agent name:** linear-agent");
    expect(config.instructions).toContain("Linear workspace operator");
    expect(config.name).toBe("linear-agent");
  });

  it("enables Slack channel and web chat for the Slack template", () => {
    const config = applyAgentTemplate(createDefaultProject(), "slack");
    const enabled = config.capabilities.filter((item) => item.enabled).map((item) => item.id);

    expect(enabled).toContain("channel-slack");
    expect(enabled).toContain("channel-eve");
    expect(getAgentTemplate("slack").evalAssertion).toBe("help");
  });

  it("enables both Linear and Notion for project management", () => {
    const config = applyAgentTemplate(createDefaultProject(), "project-management");
    const enabled = config.capabilities.filter((item) => item.enabled).map((item) => item.id);

    expect(enabled).toContain("connection-linear");
    expect(enabled).toContain("connection-notion");
  });
});
