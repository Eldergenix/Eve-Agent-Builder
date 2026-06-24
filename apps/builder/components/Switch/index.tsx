import { Switch as HeadlessSwitch } from "@headlessui/react";

type SwitchProps = {
  className?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
};

const Switch = ({ className, checked, onChange, "aria-label": ariaLabel }: SwitchProps) => (
  <HeadlessSwitch
    className={`group inline-flex w-10 h-5.5 p-0.5 rounded-full bg-shade-04 shadow-[inset_0_0_0_1px_#ccc] transition-[background-color,box-shadow] duration-[400ms] data-[checked]:bg-[#007fff] data-[checked]:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 motion-reduce:transition-none ${
      className || ""
    }`}
    checked={checked}
    onChange={onChange}
    aria-label={ariaLabel}
  >
    <span className="size-4.5 rounded-full bg-white shadow-[0_2px_5px_rgba(153,153,153,0.85)] transition-[transform,background-color,box-shadow] duration-[400ms] group-data-[checked]:translate-x-4.5 motion-reduce:transition-none" />
  </HeadlessSwitch>
);

export default Switch;
