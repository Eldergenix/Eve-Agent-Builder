"use client";

import Switch from "@/components/Switch";
import { useBuilderStore } from "@/store/agent-builder-store";
import type { CapabilityItem } from "@/types";

type Props = {
  item: CapabilityItem;
};

const CapabilityDetail = ({ item }: Props) => {
  const updateCapability = useBuilderStore((s) => s.updateCapability);

  return (
    <section className="border-b border-s-01 px-4 py-3" aria-label={`${item.name} settings`}>
      <h3 className="mb-2 text-body-sm text-secondary capitalize">{item.kind.replace("-", " ")}</h3>
      <label className="mb-2 block text-body-sm text-secondary" htmlFor={`cap-desc-${item.id}`}>
        Description
      </label>
      <textarea
        id={`cap-desc-${item.id}`}
        className="mb-3 min-h-20 w-full resize-y rounded-xl border border-s-01 bg-surface-03 p-3 text-body-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        value={item.description}
        onChange={(e) => updateCapability(item.id, { description: e.target.value })}
        spellCheck={false}
      />
      {item.kind === "tool" && (
        <div className="flex items-center justify-between rounded-xl border border-s-01 bg-surface-03 px-3 py-2">
          <span className="text-body-md text-primary">Requires approval</span>
          <Switch
            checked={item.requiresApproval ?? false}
            onChange={(checked) => updateCapability(item.id, { requiresApproval: checked })}
            aria-label={`Require approval for ${item.name}`}
          />
        </div>
      )}
      {item.kind === "schedule" && (
        <>
          <label className="mb-1 block text-body-sm text-secondary" htmlFor={`cap-cron-${item.id}`}>
            Cron expression
          </label>
          <input
            id={`cap-cron-${item.id}`}
            className="h-10 w-full rounded-[0.625rem] border border-s-01 bg-surface-03 px-3 font-mono text-body-md text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            name={`cron-${item.id}`}
            autoComplete="off"
            spellCheck={false}
            placeholder="0 9 * * 1…"
            value={item.cron ?? ""}
            onChange={(e) => updateCapability(item.id, { cron: e.target.value })}
          />
        </>
      )}
    </section>
  );
};

export default CapabilityDetail;
