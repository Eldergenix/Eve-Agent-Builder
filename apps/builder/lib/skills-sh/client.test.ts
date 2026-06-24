import { describe, expect, it } from "vitest";

import { parseSkillsShId } from "@/lib/skills-sh/client";

describe("parseSkillsShId", () => {
  it("splits owner, repo, and slug from a skills.sh id", () => {
    expect(parseSkillsShId("vercel-labs/skills/find-skills")).toEqual({
      owner: "vercel-labs",
      repo: "skills",
      slug: "find-skills",
      source: "vercel-labs/skills",
    });
  });
});
