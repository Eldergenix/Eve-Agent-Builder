import { describe, expect, it } from "vitest";

import { exportSkillFiles } from "@/lib/agent-config/export-skills";
import { capabilityFromSkillsSh, skillDirectoryName } from "@/lib/skills-sh/skill-capability";
import type { SkillsShSkill, SkillsShSkillDetail } from "@/lib/skills-sh/types";
import type { CapabilityItem } from "@/types";

describe("skills.sh capability helpers", () => {
  it("sanitizes directory names", () => {
    expect(skillDirectoryName("React Native")).toBe("react-native");
  });

  it("builds a capability from skills.sh listing and detail", () => {
    const listing: SkillsShSkill = {
      id: "vercel-labs/skills/find-skills",
      slug: "find-skills",
      name: "find-skills",
      source: "vercel-labs/skills",
      installs: 100,
      sourceType: "github",
      installUrl: "https://github.com/vercel-labs/skills",
      url: "https://skills.sh/vercel-labs/skills/find-skills",
    };
    const detail: SkillsShSkillDetail = {
      id: listing.id,
      source: listing.source,
      slug: listing.slug,
      installs: listing.installs,
      hash: "abc",
      files: [
        {
          path: "SKILL.md",
          contents: "---\ndescription: Find installed skills\n---\n\n# Find skills\n",
        },
      ],
    };

    const capability = capabilityFromSkillsSh(listing, detail);
    expect(capability.skillsShId).toBe(listing.id);
    expect(capability.description).toBe("Find installed skills");
    expect(capability.name).toBe("find-skills");
  });

  it("exports packaged skills into a skill directory", () => {
    const skill: CapabilityItem = {
      id: "skill-sh-test",
      kind: "skill",
      name: "find-skills",
      description: "Find skills",
      enabled: true,
      icon: "bulb",
      skillFiles: {
        "SKILL.md": "# Skill\n",
        "examples/demo.ts": "export {};\n",
      },
    };

    expect(exportSkillFiles(skill)).toEqual({
      "agent/skills/find-skills/SKILL.md": "# Skill\n",
      "agent/skills/find-skills/examples/demo.ts": "export {};\n",
    });
  });
});
