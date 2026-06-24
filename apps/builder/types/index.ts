export type TabItem = {
  id: number;
  name: string;
  onClick?: () => void;
};

export type CapabilityKind =
  | "tool"
  | "framework-tool"
  | "connection"
  | "channel"
  | "skill"
  | "subagent"
  | "schedule"
  | "hook";

export type CapabilityItem = {
  id: string;
  kind: CapabilityKind;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
  slug?: string;
  requiresApproval?: boolean;
  cron?: string;
  /** skills.sh stable id, e.g. vercel-labs/skills/find-skills */
  skillsShId?: string;
  skillsShUrl?: string;
  /** Relative paths from the skill package to file contents */
  skillFiles?: Record<string, string>;
};
