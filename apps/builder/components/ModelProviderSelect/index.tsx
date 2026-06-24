"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { useMemo } from "react";

import Icon from "@/components/Icon";
import {
  buildGatewayProviderOptions,
  resolveGatewayProviderOption,
  type GatewayModelOption,
} from "@/lib/ai-gateway/models";

type Props = {
  label?: string;
  value: string;
  onChange: (modelId: string) => void;
  options: GatewayModelOption[];
  isLoading?: boolean;
  menuMinWidth?: string;
};

const ModelProviderSelect = ({
  label,
  value,
  onChange,
  options,
  isLoading,
  menuMinWidth = "16rem",
}: Props) => {
  const providerOptions = useMemo(
    () => buildGatewayProviderOptions(options, value),
    [options, value],
  );
  const selected = resolveGatewayProviderOption(providerOptions, value);
  const disabled = isLoading || providerOptions.length === 0;

  function handleProviderChange(providerId: string) {
    const option = providerOptions.find((item) => item.id === providerId);
    if (!option || option.modelId === value) return;
    onChange(option.modelId);
  }

  return (
    <Listbox value={selected.id} onChange={handleProviderChange} as="div" disabled={disabled}>
      <ListboxButton
        className={`group flex h-10 w-full items-center rounded-[0.625rem] border border-s-01 bg-surface-03 px-3 text-body-lg text-primary transition-[border-color,background-color] data-[hover]:border-s-02 data-[open]:border-s-02 data-[open]:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
          disabled ? "cursor-default text-secondary/70" : "data-[hover]:bg-surface-02"
        } ${label ? "text-secondary/50" : ""}`}
      >
        {label ? <div className="shrink-0 pr-2 text-primary">{label}</div> : null}
        <div className="min-w-0 truncate pr-2">{isLoading ? "Loading…" : selected.label}</div>
        <Icon
          className={`ml-auto shrink-0 fill-secondary transition-transform group-[[data-open]]:rotate-180 ${
            disabled ? "opacity-40" : ""
          }`}
          name="chevron"
          aria-hidden="true"
        />
      </ListboxButton>
      <ListboxOptions
        className="z-100 [--anchor-gap:2px] w-max min-w-[max(var(--button-width),var(--provider-menu-min-width))] max-w-[min(calc(100vw-1.5rem),22rem)] rounded-[0.625rem] border border-s-02 bg-surface-01 p-1 shadow-toolbar origin-top transition-[transform,opacity] duration-200 ease-out focus-visible:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 motion-reduce:transition-none"
        style={{ ["--provider-menu-min-width" as string]: menuMinWidth }}
        anchor="bottom"
        transition
        modal={false}
      >
        <div className="border-b border-s-01 px-2 py-1.5 text-body-sm text-secondary">
          {providerOptions.length.toLocaleString()} AI Gateway provider
          {providerOptions.length === 1 ? "" : "s"} for {selected.modelLabel}
        </div>
        {providerOptions.map((option) => (
          <ListboxOption
            key={option.id}
            className={`relative cursor-pointer rounded-lg p-2 text-body-lg transition-colors data-[focus]:bg-surface-03 data-[focus]:text-primary data-[focus]:ring-2 data-[focus]:ring-primary/20 ${
              option.id === selected.id ? "bg-surface-03/70 text-primary" : "text-secondary"
            }`}
            value={option.id}
          >
            <p className="text-primary">{option.label}</p>
            <p className="break-all text-body-sm text-secondary">{option.modelId}</p>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
};

export default ModelProviderSelect;
