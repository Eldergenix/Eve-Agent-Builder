import { describe, expect, it } from "vitest";

import { upsertAgentNameInInstructions } from "@/lib/agent-config/instructions-name";

describe("upsertAgentNameInInstructions", () => {
  it("replaces the agent name placeholder in the identity line", () => {
    const instructions = `# Identity

**Agent name:** {{agentName}}

You are a helpful assistant.`;

    expect(upsertAgentNameInInstructions(instructions, "support-bot")).toContain(
      "**Agent name:** support-bot",
    );
  });

  it("updates an existing agent name line when renaming", () => {
    const instructions = `# Identity

**Agent name:** old-name

You are a helpful assistant.`;

    const next = upsertAgentNameInInstructions(instructions, "new-name");
    expect(next).toContain("**Agent name:** new-name");
    expect(next).not.toContain("old-name");
  });

  it("inserts an agent name line under Identity when missing", () => {
    const instructions = `# Identity

You are a helpful assistant.`;

    expect(upsertAgentNameInInstructions(instructions, "ops-agent")).toContain(
      "**Agent name:** ops-agent",
    );
  });
});
