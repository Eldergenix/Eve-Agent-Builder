"use client";

import type { ReactNode } from "react";

type Option = {
  id: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  renderIcon?: (option: Option) => ReactNode;
  size?: "default" | "compact";
  wrap?: boolean;
};

const SegmentToggle = ({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Segmented control",
  renderIcon,
  size = "default",
  wrap = false,
}: Props) => {
  const buttonSizeClassName =
    size === "compact" ? "px-2 py-1 text-body-sm" : "px-3 py-1.5 text-body-md";
  const buttonLayoutClassName = wrap ? "min-w-[4.5rem] flex-1" : "min-w-0 flex-1";
  const layoutClassName = wrap
    ? "min-h-9 flex-wrap items-stretch gap-1 overflow-visible"
    : "h-9 items-center overflow-hidden";

  return (
    <div
      className={`flex rounded-[0.625rem] border border-s-01 bg-surface-03 p-1 shadow-[inset_0px_1px_1.9px_0px_var(--shade-07_10)] ${layoutClassName} ${className ?? ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={option.label}
            className={`flex items-center justify-center gap-1.5 rounded-md transition-[background-color,box-shadow,color] duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${buttonLayoutClassName} ${buttonSizeClassName} ${
              active
                ? "bg-surface-01 text-primary shadow-[0px_1px_4px_0px_rgba(0,0,0,0.14)]"
                : "text-secondary hover:text-primary"
            }`}
            onClick={() => onChange(option.id)}
          >
            {renderIcon ? (
              <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
                {renderIcon(option)}
              </span>
            ) : null}
            <span className="min-w-0 truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentToggle;
