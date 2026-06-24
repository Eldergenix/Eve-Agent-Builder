"use client";

import Icon from "@/components/Icon";

type Props = {
  className?: string;
  vertical?: boolean;
  stepCount: number;
  currentStep: number;
  onStepChange: (step: number) => void;
  getStepLabel?: (step: number) => string;
};

const ViewController = ({
  className,
  vertical,
  stepCount,
  currentStep,
  onStepChange,
  getStepLabel,
}: Props) => {
  const canGoBack = currentStep > 0;
  const canGoForward = currentStep < stepCount - 1;

  return (
    <div
      className={`absolute flex items-center gap-3 rounded-full border border-s-01 bg-surface-01 shadow-depth-01 ${
        vertical
          ? "top-1/2 right-full mr-3 w-11 -translate-y-1/2 flex-col-reverse py-5"
          : "bottom-full left-1/2 mb-4 h-11 -translate-x-1/2 flex-row px-5"
      } ${className || ""}`}
      role="group"
      aria-label="Form step navigation"
    >
      <button
        type="button"
        className="rounded-full p-1 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Previous step"
        disabled={!canGoBack}
        onClick={() => onStepChange(currentStep - 1)}
      >
        <Icon
          className={`!size-4 fill-secondary ${vertical ? "rotate-90" : "rotate-180"}`}
          name="arrow"
          aria-hidden="true"
        />
      </button>

      <div
        className={`flex items-center gap-2 ${vertical ? "flex-col" : ""}`}
        role="tablist"
        aria-label="Form steps"
      >
        {Array.from({ length: stepCount }, (_, index) => {
          const isActive = index === currentStep;
          const label = getStepLabel?.(index) ?? `Step ${index + 1}`;

          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={label}
              aria-current={isActive ? "step" : undefined}
              className="rounded-full p-1 focus-visible:ring-2 focus-visible:ring-primary/20"
              onClick={() => onStepChange(index)}
            >
              <span
                className={`block rounded-full bg-primary transition-all ${
                  vertical
                    ? isActive
                      ? "h-[0.09375rem] w-3.5"
                      : "h-[0.09375rem] w-2 bg-primary/30"
                    : isActive
                      ? "h-3.5 w-[0.09375rem]"
                      : "h-2 w-[0.09375rem] bg-primary/30"
                }`}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="rounded-full p-1 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next step"
        disabled={!canGoForward}
        onClick={() => onStepChange(currentStep + 1)}
      >
        <Icon
          className={`!size-4 ${vertical ? "-rotate-90" : ""}`}
          name="arrow"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

export default ViewController;
