export const CONFIG_FORM_STEPS = [
  {
    id: "agent-type",
    title: "Agent type",
    description:
      "Choose a template to preconfigure tools, connections, channels, and instructions.",
  },
  {
    id: "system-prompt",
    title: "System prompt",
    description: "The always-on markdown instructions loaded on every turn.",
    exportPath: "agent/instructions.md",
  },
  {
    id: "skills",
    title: "Skills",
    description: "Search skills.sh and add SKILL.md packages to your agent.",
  },
  {
    id: "eval-defaults",
    title: "Eval defaults",
    description: "Smoke test prompt and assertion for the generated eval scaffold.",
    exportPath: "evals/smoke.eval.ts",
  },
  {
    id: "deployment",
    title: "Deployment",
    description: "Choose hosting, observability, services, and one-click deploy settings.",
    exportPath: "deploy/manifest.json",
  },
] as const;

export const MOBILE_CONFIG_FORM_STEPS = [
  ...CONFIG_FORM_STEPS,
  {
    id: "capabilities",
    title: "Capabilities",
    description: "Choose active tools, connections, channels, skills, and agent features.",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Tune model, provider, export, runtime, and observability defaults.",
  },
] as const;

export type ConfigFormStepId = (typeof MOBILE_CONFIG_FORM_STEPS)[number]["id"];

export const CONFIG_FORM_STEP_COUNT = CONFIG_FORM_STEPS.length;

export const MOBILE_CONFIG_FORM_STEP_COUNT = MOBILE_CONFIG_FORM_STEPS.length;

export function clampConfigFormStep(
  step: number,
  stepCount: number = MOBILE_CONFIG_FORM_STEP_COUNT,
): number {
  return Math.max(0, Math.min(stepCount - 1, step));
}
