"use client";

import CapabilityExplorer from "@/components/builder/CapabilityExplorer";
import Head from "@/components/builder/LeftSidebar/Head";
import SearchBar from "@/components/SearchBar";
import { useBuilderStore } from "@/store/agent-builder-store";

const MobileCapabilitiesStep = () => {
  const searchQuery = useBuilderStore((s) => s.searchQuery);
  const setSearchQuery = useBuilderStore((s) => s.setSearchQuery);

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-s-01 bg-surface-02/60">
      <Head
        idPrefix="mobile-agent"
        rightContent={
          <SearchBar
            className="border border-s-01 bg-surface-03"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        }
      />
      <CapabilityExplorer
        className="min-h-0 flex-1"
        tabsClassName="border-b border-s-01 px-3 py-3"
        listClassName="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain"
        showSearch={false}
      />
    </div>
  );
};

export default MobileCapabilitiesStep;
