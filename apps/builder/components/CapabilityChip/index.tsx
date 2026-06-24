"use client";

import ChannelLogo from "@/components/ChannelLogo";
import Icon from "@/components/Icon";
import { resolveCapabilityIcon } from "@/lib/capability-icons";
import type { CapabilityItem } from "@/types";

type Props = {
  item: CapabilityItem;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
};

const CapabilityChip = ({ item, selected, onSelect, onToggle }: Props) => {
  const icon = resolveCapabilityIcon(item);

  return (
    <button
      type="button"
      aria-pressed={item.enabled}
      aria-label={`${item.name} — ${item.enabled ? "enabled" : "disabled"}. Press Space to toggle.`}
      className={`relative flex h-[100px] min-w-[98px] flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-1 transition-[opacity,box-shadow] duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
        item.enabled
          ? selected
            ? "bg-surface-01 ring-1 ring-s-02 shadow-[0px_0px_4px_0px_rgba(18,18,18,0.10)]"
            : "bg-surface-03 hover:bg-surface-01"
          : "bg-surface-03 opacity-50"
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <span
        className={`flex size-16 items-center justify-center rounded-2xl ${
          item.enabled
            ? "bg-surface-01 shadow-[0px_0px_4px_0px_rgba(18,18,18,0.10)]"
            : "bg-surface-01/60"
        }`}
      >
        {item.kind === "channel" ? (
          <ChannelLogo
            className="size-8"
            fallbackIcon={icon}
            slug={item.slug ?? item.name}
            aria-hidden="true"
          />
        ) : (
          <Icon className="!size-6" name={icon} aria-hidden="true" />
        )}
      </span>
      <span className="max-w-full truncate px-2 text-body-sm text-primary">{item.name}</span>
      <span
        className={`absolute right-2 top-2 size-2 rounded-full ${
          item.enabled ? "bg-green" : "bg-shade-05"
        }`}
        aria-hidden="true"
      />
    </button>
  );
};

export default CapabilityChip;
