import type { SkillsShSkill, SkillsShSkillDetail } from "@/lib/skills-sh/types";
import type { CapabilityItem } from "@/types";

export function capabilityIdFromSkillsSh(id: string): string {
  return `skill-sh-${id.replace(/\//g, "--")}`;
}

export function skillDirectoryName(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
}

function descriptionFromSkillMd(contents: string, fallback: string): string {
  const frontmatter = contents.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatter) return fallback;

  const descriptionLine = frontmatter[1].match(/^description:\s*(.+)$/m);
  if (!descriptionLine) return fallback;

  return descriptionLine[1].replace(/^["']|["']$/g, "").trim() || fallback;
}

export function capabilityFromSkillsSh(
  listing: SkillsShSkill,
  detail: SkillsShSkillDetail,
): CapabilityItem {
  const files = detail.files ?? [];
  const skillMd = files.find((file) => file.path === "SKILL.md" || file.path.endsWith("/SKILL.md"));
  const skillFiles = Object.fromEntries(files.map((file) => [file.path, file.contents]));
  const directoryName = skillDirectoryName(detail.slug);

  return {
    id: capabilityIdFromSkillsSh(listing.id),
    kind: "skill",
    name: directoryName,
    description: skillMd ? descriptionFromSkillMd(skillMd.contents, listing.name) : listing.name,
    enabled: true,
    icon: "bulb",
    slug: detail.slug,
    skillsShId: listing.id,
    skillsShUrl: listing.url,
    skillFiles,
  };
}

export function isSkillsShSkill(item: CapabilityItem): boolean {
  return item.kind === "skill" && Boolean(item.skillsShId);
}
