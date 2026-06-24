"use client";

type Props = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
};

const SliderControl = ({ label, min, max, step, value, displayValue, onChange }: Props) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-2 px-1">
      <label className="text-body-sm text-primary" htmlFor={`slider-${label}`}>
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <div className="relative h-9 w-[118px] shrink-0 rounded-lg bg-surface-03">
          <div
            className="absolute inset-y-0 left-0 rounded-lg bg-shade-06_30"
            style={{ width: `${percent}%` }}
          />
          <input
            id={`slider-${label}`}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="range-slider absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:rounded-lg"
            aria-valuetext={displayValue}
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-[0.625rem] bg-surface-03 px-3 py-2.5 text-body-md text-primary">
          <IconExpand aria-hidden="true" />
          <span className="tabular-nums" translate="no">
            {displayValue}
          </span>
        </div>
      </div>
    </div>
  );
};

function IconExpand({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg
      className="size-4 shrink-0 fill-primary"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden={ariaHidden}
    >
      <path d="M3.818 5.789a.93.93 0 0 1 1.348 0c.372.386.372 1.011 0 1.397L3.403 9.011h13.193l-1.762-1.825c-.338-.351-.369-.899-.092-1.286l.092-.111a.93.93 0 0 1 1.348 0l2.791 2.891c.703.729.703 1.91 0 2.639l-2.79 2.891a.93.93 0 0 1-1.348 0c-.372-.386-.372-1.011 0-1.397l1.762-1.827H3.403l1.763 1.827c.338.351.369.899.092 1.286l-.092.111a.93.93 0 0 1-1.348 0l-2.79-2.891c-.703-.729-.703-1.91 0-2.639l2.79-2.891z" />
    </svg>
  );
}

export default SliderControl;
