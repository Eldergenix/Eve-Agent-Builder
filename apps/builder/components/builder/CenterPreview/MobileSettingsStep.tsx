"use client";

import AgentSettingsPanel from "@/components/builder/AgentSettingsPanel";

const MobileSettingsStep = () => (
  <AgentSettingsPanel
    className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-s-01 bg-surface-02/60"
    tabsClassName="border-b border-s-01 px-3 py-3"
    contentClassName="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain"
  />
);

export default MobileSettingsStep;
