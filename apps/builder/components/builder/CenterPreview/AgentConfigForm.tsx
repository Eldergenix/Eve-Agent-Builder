"use client";

import { useEffect, useState } from "react";

import Button from "@/components/Button";
import AgentSkillsStep from "@/components/builder/CenterPreview/AgentSkillsStep";
import AgentTemplateStep from "@/components/builder/CenterPreview/AgentTemplateStep";
import DeploymentStep from "@/components/builder/CenterPreview/DeploymentStep";
import MobileCapabilitiesStep from "@/components/builder/CenterPreview/MobileCapabilitiesStep";
import MobileSettingsStep from "@/components/builder/CenterPreview/MobileSettingsStep";
import {
  CONFIG_FORM_STEPS,
  MOBILE_CONFIG_FORM_STEPS,
  clampConfigFormStep,
} from "@/lib/agent-config/form-steps";
import { useBuilderStore } from "@/store/agent-builder-store";

function FieldLabel({ htmlFor, title, hint }: { htmlFor: string; title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <label className="text-body-md-str text-primary" htmlFor={htmlFor}>
        {title}
      </label>
      {hint ? <p className="mt-0.5 text-body-sm text-secondary">{hint}</p> : null}
    </div>
  );
}

const inputClassName =
  "w-full rounded-xl border border-s-01 bg-surface-03 px-3 py-2 text-body-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

function StepBadge({
  index,
  isActive,
  isComplete,
}: {
  index: number;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-body-sm ${
        isActive
          ? "border-s-02 bg-primary text-surface-01"
          : isComplete
            ? "border-s-02 bg-surface-01 text-primary"
            : "border-s-01 bg-surface-03 text-secondary"
      }`}
      aria-hidden="true"
    >
      {index + 1}
    </span>
  );
}

function useCompactFormSteps() {
  const [isCompact, setIsCompact] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1340px)");
    const sync = () => {
      setIsCompact(mediaQuery.matches);
      setIsResolved(true);
    };
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return { isCompact, isResolved };
}

const AgentConfigForm = () => {
  const stepIndex = useBuilderStore((s) => s.configFormStep);
  const setConfigFormStep = useBuilderStore((s) => s.setConfigFormStep);
  const instructions = useBuilderStore((s) => s.instructions);
  const setInstructions = useBuilderStore((s) => s.setInstructions);
  const evalPrompt = useBuilderStore((s) => s.evalPrompt);
  const setEvalPrompt = useBuilderStore((s) => s.setEvalPrompt);
  const evalAssertion = useBuilderStore((s) => s.evalAssertion);
  const setEvalAssertion = useBuilderStore((s) => s.setEvalAssertion);
  const { isCompact, isResolved } = useCompactFormSteps();

  const steps = isCompact ? MOBILE_CONFIG_FORM_STEPS : CONFIG_FORM_STEPS;
  const safeStepIndex = clampConfigFormStep(stepIndex, steps.length);
  const step = steps[safeStepIndex] ?? steps[0];
  const isFirstStep = safeStepIndex === 0;
  const isLastStep = safeStepIndex === steps.length - 1;
  const progressPercent = ((safeStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    if (isResolved && safeStepIndex !== stepIndex) {
      setConfigFormStep(safeStepIndex);
    }
  }, [isResolved, safeStepIndex, setConfigFormStep, stepIndex]);

  function goBack() {
    setConfigFormStep(safeStepIndex - 1);
  }

  function goNext() {
    setConfigFormStep(safeStepIndex + 1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col justify-start overflow-hidden px-3 py-3 sm:px-5 sm:py-5 min-[1341px]:justify-center min-[1341px]:px-6">
      <form
        className="mx-auto grid h-full max-h-full min-h-0 w-full max-w-[50rem] grid-rows-[auto_minmax(0,1fr)_auto]"
        onSubmit={(e) => e.preventDefault()}
      >
        <header className="min-w-0 shrink-0">
          <div className="flex min-w-0 flex-col gap-3 px-1 py-1 sm:px-0 sm:py-2">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-body-sm text-secondary">
                  Step {safeStepIndex + 1} of {steps.length}
                </p>
                <h1 className="mt-1 text-title-str text-primary sm:text-h5">Configure agent</h1>
                <p className="mt-1 max-w-2xl text-body-md text-secondary">
                  {"exportPath" in step && step.exportPath ? (
                    <>
                      Changes are written to{" "}
                      <code className="text-body-sm text-primary">{step.exportPath}</code> when you
                      export.
                    </>
                  ) : (
                    step.description
                  )}
                </p>
              </div>
              <span className="inline-flex h-7 shrink-0 items-center rounded-lg border border-s-01 bg-surface-03 px-2.5 text-body-sm text-secondary">
                {step.title}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-surface-03" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <ol
              className="grid gap-1.5 pb-1 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
              aria-label="Form steps"
            >
              {steps.map((item, index) => {
                const isActive = index === safeStepIndex;
                const isComplete = index < safeStepIndex;

                return (
                  <li key={item.id} className="min-w-0">
                    <button
                      type="button"
                      className={`flex h-full min-h-10 w-full items-center gap-1.5 rounded-xl border px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:gap-2 sm:px-2.5 ${
                        isActive
                          ? "border-s-02 bg-surface-01 shadow-depth-01"
                          : "border-s-01 bg-surface-03/60 hover:bg-surface-03"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                      title={item.title}
                      onClick={() => setConfigFormStep(index)}
                    >
                      <StepBadge index={index} isActive={isActive} isComplete={isComplete} />
                      <span
                        className={`block min-w-0 truncate text-body-sm ${isActive || isComplete ? "text-primary" : "text-secondary"}`}
                      >
                        {item.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </header>

        <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-s-01 bg-surface-01 p-4 shadow-depth-01 sm:mt-4 sm:p-5">
          <div className="shrink-0">
            <h2 className="text-heading-str text-primary">{step.title}</h2>
            <p className="mt-0.5 text-body-sm text-secondary">{step.description}</p>
          </div>

          {step.id === "agent-type" ? (
            <AgentTemplateStep />
          ) : step.id === "system-prompt" ? (
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <FieldLabel
                htmlFor="system-prompt"
                title="System prompt"
                hint="Use headings to organize identity, capabilities, and behavior."
              />
              <textarea
                id="system-prompt"
                className={`${inputClassName} min-h-44 flex-1 resize-none font-mono text-body-sm leading-relaxed`}
                name="system-prompt"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                spellCheck={false}
                placeholder="# Identity&#10;&#10;You are a helpful assistant…"
              />
              <p className="mt-1.5 text-body-sm text-secondary">
                {instructions.length.toLocaleString()} characters
              </p>
            </div>
          ) : step.id === "skills" ? (
            <AgentSkillsStep />
          ) : step.id === "deployment" ? (
            <DeploymentStep />
          ) : step.id === "capabilities" ? (
            <MobileCapabilitiesStep />
          ) : step.id === "settings" ? (
            <MobileSettingsStep />
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <FieldLabel
                  htmlFor="eval-prompt"
                  title="Smoke eval prompt"
                  hint="Used when at least one tool is enabled in the exported project."
                />
                <textarea
                  id="eval-prompt"
                  className={`${inputClassName} min-h-28 resize-y`}
                  name="eval-prompt"
                  value={evalPrompt}
                  onChange={(e) => setEvalPrompt(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <div>
                <FieldLabel
                  htmlFor="eval-assertion"
                  title="Expected response contains"
                  hint="Assertion value for the smoke eval contains check."
                />
                <input
                  id="eval-assertion"
                  className={inputClassName}
                  name="eval-assertion"
                  type="text"
                  value={evalAssertion}
                  onChange={(e) => setEvalAssertion(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </section>

        <footer className="mt-3 flex shrink-0 flex-col gap-2 px-1 py-1 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:py-2">
          <Button
            type="button"
            isSecondary
            className="w-full min-w-24 sm:w-auto"
            disabled={isFirstStep}
            onClick={goBack}
          >
            Back
          </Button>

          <p className="text-body-sm text-secondary" aria-live="polite">
            {step.title}
          </p>

          {isLastStep ? (
            <Button
              type="button"
              isPrimary
              className="w-full min-w-24 sm:w-auto"
              onClick={() => setConfigFormStep(0)}
            >
              Done
            </Button>
          ) : (
            <Button type="button" isPrimary className="w-full min-w-24 sm:w-auto" onClick={goNext}>
              Next
            </Button>
          )}
        </footer>
      </form>
    </div>
  );
};

export default AgentConfigForm;
