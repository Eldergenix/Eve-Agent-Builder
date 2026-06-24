const AGENT_NAME_LINE = /^\*\*Agent name:\*\*.+$/m;

export function upsertAgentNameInInstructions(instructions: string, name: string): string {
  const agentName = name.trim() || "my-eve-agent";
  const agentNameLine = `**Agent name:** ${agentName}`;

  if (/\*\*Agent name:\*\*\s*\{\{agentName\}\}/.test(instructions)) {
    return instructions.replace(/\*\*Agent name:\*\*\s*\{\{agentName\}\}/, agentNameLine);
  }

  if (AGENT_NAME_LINE.test(instructions)) {
    return instructions.replace(AGENT_NAME_LINE, agentNameLine);
  }

  if (instructions.includes("{{agentName}}")) {
    return instructions.replace(/\{\{agentName\}\}/g, agentName);
  }

  if (/# Identity\s*\n/.test(instructions)) {
    return instructions.replace(/(# Identity\s*\n)/, `$1\n${agentNameLine}\n\n`);
  }

  return `# Identity\n\n${agentNameLine}\n\n${instructions}`;
}

export function resolveInstructionsForExport(instructions: string, name: string): string {
  return upsertAgentNameInInstructions(instructions, name);
}

export function ensureAgentNamePlaceholder(instructions: string): string {
  if (/\*\*Agent name:\*\*/.test(instructions) || instructions.includes("{{agentName}}")) {
    return instructions;
  }

  if (/# Identity\s*\n/.test(instructions)) {
    return instructions.replace(/(# Identity\s*\n\n?)/, `$1**Agent name:** {{agentName}}\n\n`);
  }

  return `# Identity\n\n**Agent name:** {{agentName}}\n\n${instructions}`;
}
