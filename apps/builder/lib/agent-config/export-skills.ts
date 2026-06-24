import type { CapabilityItem } from "@/types";

export function exportSkillFiles(skill: CapabilityItem): Record<string, string> {
  const files: Record<string, string> = {};
  const entries = Object.entries(skill.skillFiles ?? {});

  if (entries.length === 0) {
    files[`agent/skills/${skill.name}.md`] = `---
description: ${JSON.stringify(skill.description)}
---

# ${skill.name}

${skill.description}
`;
    return files;
  }

  const usesSkillFolder =
    entries.length > 1 || entries.some(([path]) => path.includes("/") || path !== "SKILL.md");

  if (usesSkillFolder) {
    for (const [path, contents] of entries) {
      files[`agent/skills/${skill.name}/${path}`] = contents;
    }
    return files;
  }

  const [, contents] = entries[0];
  files[`agent/skills/${skill.name}.md`] = contents;
  return files;
}
