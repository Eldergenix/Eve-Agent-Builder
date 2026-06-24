"use client";

import ChannelLogo from "@/components/ChannelLogo";
import Icon from "@/components/Icon";
import Switch from "@/components/Switch";
import { resolveCapabilityIcon } from "@/lib/capability-icons";
import type { CapabilityItem } from "@/types";

type Props = {
  item: CapabilityItem;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
};

const CapabilityRow = ({ item, selected, onSelect, onToggle }: Props) => {
  const showBrandLogo = item.kind === "channel" || item.kind === "connection";
  const icon = resolveCapabilityIcon(item);
  const statusLabel = item.enabled ? "Active" : "Inactive";

  return (
    <div className="group/item relative">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select ${item.name}. ${statusLabel}.`}
        className={`group/button flex w-full items-center gap-3 rounded-xl border p-0.75 pr-14 transition-colors group-hover/item:bg-surface-03 focus-visible:ring-2 focus-visible:ring-primary/20 ${
          selected ? "border-s-02 bg-surface-03" : "border-transparent"
        } ${item.enabled ? "" : "text-secondary"}`}
        onClick={onSelect}
      >
        <div
          className={`flex justify-center items-center shrink-0 size-8 rounded-lg transition-[background-color,box-shadow] group-hover/item:bg-surface-01 ${
            selected
              ? "bg-surface-01 shadow-[0_0px_4px_0px_rgba(18,18,18,0.10)]"
              : item.enabled
                ? "bg-surface-03"
                : "bg-surface-03/60"
          }`}
        >
          {showBrandLogo ? (
            <ChannelLogo
              className="size-5"
              fallbackIcon={icon}
              slug={item.slug ?? item.name}
              aria-hidden="true"
            />
          ) : (
            <Icon className="!size-4" name={icon} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <div
            className={`truncate text-body-md ${item.enabled ? "text-primary" : "text-secondary"}`}
          >
            {item.name}
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-body-sm text-secondary">
            <span className="min-w-0 truncate">{item.kind}</span>
            <span aria-hidden="true">·</span>
            <span className={item.enabled ? "text-green" : "text-secondary"}>{statusLabel}</span>
          </div>
        </div>
      </button>
      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        <Switch
          checked={item.enabled}
          onChange={onToggle}
          aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.name}`}
        />
      </div>
    </div>
  );
};

export default CapabilityRow;
