"use client";

import {
  CONFIG_FORM_STEP_COUNT,
  CONFIG_FORM_STEPS,
  clampConfigFormStep,
} from "@/lib/agent-config/form-steps";
import { useBuilderStore } from "@/store/agent-builder-store";

export function useConfigFormNavigation() {
  const configFormStep = useBuilderStore((s) => s.configFormStep);
  const setConfigFormStep = useBuilderStore((s) => s.setConfigFormStep);
  const setCenterView = useBuilderStore((s) => s.setCenterView);

  function goToStep(step: number) {
    setCenterView("spec");
    setConfigFormStep(clampConfigFormStep(step, CONFIG_FORM_STEP_COUNT));
  }

  return {
    stepCount: CONFIG_FORM_STEP_COUNT,
    currentStep: configFormStep,
    onStepChange: goToStep,
    getStepLabel: (step: number) => CONFIG_FORM_STEPS[step]?.title ?? `Step ${step + 1}`,
  };
}
