"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { useMemo, useRef, useState } from "react";

import Icon from "@/components/Icon";
import {
  filterGatewayModelOptions,
  mergeGatewayModelOptions,
  resolveGatewayModelOption,
  type GatewayModelOption,
} from "@/lib/ai-gateway/models";

type ModelSelectProps = {
  className?: string;
  classButton?: string;
  classIcon?: string;
  label?: string;
  value: string;
  onChange: (modelId: string) => void;
  options: GatewayModelOption[];
  isMedium?: boolean;
  isWhite?: boolean;
  icon?: string;
  isLoading?: boolean;
  /** Minimum width for the dropdown panel (defaults to 20rem). */
  menuMinWidth?: string;
};

const ModelSelect = ({
  className,
  classButton,
  classIcon,
  label,
  value,
  onChange,
  options,
  isMedium,
  isWhite,
  icon,
  isLoading,
  menuMinWidth = "20rem",
}: ModelSelectProps) => {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const mergedOptions = useMemo(() => mergeGatewayModelOptions(options, value), [options, value]);
  const filteredOptions = useMemo(
    () => filterGatewayModelOptions(mergedOptions, query),
    [mergedOptions, query],
  );
  const selected = resolveGatewayModelOption(mergedOptions, value);

  return (
    <Listbox className={className ?? ""} value={value} onChange={onChange} as="div">
      <ListboxButton
        onClick={() => {
          setQuery("");
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
        className={`group flex w-full items-center border border-s-01 rounded-[0.625rem] px-3 text-primary transition-[border-color,background-color] data-[hover]:border-s-02 data-[open]:border-s-02 data-[open]:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
          isMedium ? "h-9 text-body-md" : "h-10 text-body-lg"
        } ${
          isWhite ? "bg-transparent !border-s-02" : "bg-surface-03 data-[hover]:bg-surface-02"
        } ${label ? "text-secondary/50" : ""} ${classButton ?? ""}`}
      >
        {icon ? (
          <Icon
            className={`mr-1.5 shrink-0 !size-4 fill-secondary/70 transition-colors group-hover:fill-secondary ${
              classIcon ?? ""
            }`}
            name={icon}
          />
        ) : null}
        {label ? <div className="shrink-0 pr-2 text-primary">{label}</div> : null}
        <div className="min-w-0 truncate pr-2">{selected.id}</div>
        <Icon
          className={`ml-auto shrink-0 fill-secondary transition-transform group-[[data-open]]:rotate-180 ${
            isMedium ? "!size-4" : "!size-5"
          }`}
          name="chevron"
        />
      </ListboxButton>
      <ListboxOptions
        className="z-100 [--anchor-gap:2px] w-max min-w-[max(var(--button-width),var(--model-menu-min-width))] max-w-[min(calc(100vw-1.5rem),26rem)] rounded-[0.625rem] border border-s-02 bg-surface-01 p-1 shadow-toolbar origin-top transition-[transform,opacity] duration-200 ease-out focus-visible:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 motion-reduce:transition-none"
        style={{ ["--model-menu-min-width" as string]: menuMinWidth }}
        anchor="bottom"
        transition
        modal={false}
      >
        <div className="sticky top-0 z-10 border-b border-s-01 bg-surface-01 p-1">
          <label className="sr-only" htmlFor="model-search">
            Search models
          </label>
          <input
            ref={searchRef}
            id="model-search"
            className="h-9 w-full rounded-lg bg-surface-03 px-2.5 text-body-md text-primary outline-none placeholder:text-secondary focus-visible:ring-2 focus-visible:ring-primary/20"
            type="search"
            name="model-search"
            placeholder="Search providers and models…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
          />
          <p className="px-1 pt-1 text-body-sm text-secondary">
            {isLoading
              ? "Loading AI Gateway models…"
              : `${filteredOptions.length} language model${filteredOptions.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-3 text-body-md text-secondary">No models match “{query}”.</p>
          ) : (
            filteredOptions.map((option) => (
              <ListboxOption
                key={option.id}
                className={`relative cursor-pointer rounded-lg p-2 transition-colors data-[focus]:bg-surface-03 data-[focus]:text-primary data-[focus]:ring-2 data-[focus]:ring-primary/20 ${
                  isMedium ? "text-body-md" : "text-body-lg"
                } ${option.id === value ? "bg-surface-03/70 text-primary" : "text-secondary"}`}
                value={option.id}
              >
                <p className="break-all text-primary">{option.id}</p>
                <p className="text-body-sm text-secondary">
                  {option.label}
                  {option.provider ? ` · ${option.provider}` : null}
                </p>
              </ListboxOption>
            ))
          )}
        </div>
      </ListboxOptions>
    </Listbox>
  );
};

export default ModelSelect;
