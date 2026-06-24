import type { CapabilityItem } from "@/types";

const FRAMEWORK_TOOL_ICONS: Record<string, string> = {
  "framework-bash": "terminal",
  "framework-readFile": "show-view",
  "framework-writeFile": "pencil",
  "framework-glob": "folder",
  "framework-grep": "filter",
  "framework-webFetch": "download",
  "framework-webSearch": "explore",
  "framework-todo": "check-circle",
  "framework-loadSkill": "sparkle",
  "framework-agent": "people",
};

export function resolveCapabilityIcon(item: CapabilityItem): string {
  if (item.kind === "framework-tool") return FRAMEWORK_TOOL_ICONS[item.id] ?? item.icon;
  return item.icon;
}
