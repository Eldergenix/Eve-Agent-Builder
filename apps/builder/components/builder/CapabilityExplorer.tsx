"use client";

import { useMemo } from "react";

import SearchBar from "@/components/SearchBar";
import Tabs from "@/components/Tabs";
import { useBuilderStore } from "@/store/agent-builder-store";
import type { TabItem } from "@/types";
import { channelEntries, connectionEntries } from "@vercel/eve-catalog";

import CapabilityRow from "./LeftSidebar/CapabilityRow";

const leftTabs: TabItem[] = [
  { id: 0, name: "Active" },
  { id: 1, name: "Catalog" },
];

const KIND_ORDER = [
  "tool",
  "framework-tool",
  "connection",
  "channel",
  "skill",
  "subagent",
  "schedule",
  "hook",
] as const;

type Props = {
  className?: string;
  tabsClassName?: string;
  listClassName?: string;
  searchClassName?: string;
  showSearch?: boolean;
};

const CapabilityExplorer = ({
  className,
  tabsClassName = "border-b border-s-01 px-4 py-3",
  listClassName = "scrollbar-none grow overflow-y-auto overscroll-contain",
  searchClassName = "border-t border-s-01 p-3",
  showSearch = true,
}: Props) => {
  const capabilities = useBuilderStore((s) => s.capabilities);
  const searchQuery = useBuilderStore((s) => s.searchQuery);
  const setSearchQuery = useBuilderStore((s) => s.setSearchQuery);
  const selectedCapabilityId = useBuilderStore((s) => s.selectedCapabilityId);
  const setSelectedCapabilityId = useBuilderStore((s) => s.setSelectedCapabilityId);
  const toggleCapability = useBuilderStore((s) => s.toggleCapability);
  const addCatalogCapability = useBuilderStore((s) => s.addCatalogCapability);
  const leftTab = useBuilderStore((s) => s.leftTab);
  const setLeftTab = useBuilderStore((s) => s.setLeftTab);

  const tab =
    leftTabs.find((t) => (leftTab === "capabilities" ? t.id === 0 : t.id === 1)) ?? leftTabs[0];

  const filtered = useMemo(() => {
    let items = capabilities;
    if (tab.id === 0) {
      items = capabilities.filter((item) => item.enabled);
    }
    if (tab.id === 1) {
      const catalogSlugs = new Set([
        ...channelEntries().map((e) => `channel-${e.slug}`),
        ...connectionEntries().map((e) => `connection-${e.slug}`),
      ]);
      items = capabilities.filter((c) => catalogSlugs.has(c.id) || c.kind === "tool");
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.kind.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [capabilities, searchQuery, tab.id]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const kind of KIND_ORDER) {
      const items = filtered.filter((item) => item.kind === kind);
      if (items.length > 0) groups.set(kind, items);
    }
    return groups;
  }, [filtered]);

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className={tabsClassName}>
        <Tabs
          items={leftTabs}
          value={tab}
          setValue={(next) => setLeftTab(next.id === 0 ? "capabilities" : "catalog")}
        />
      </div>
      <div className={listClassName}>
        <div className="flex flex-col gap-4 p-3">
          {[...grouped.entries()].map(([kind, items]) => (
            <section key={kind}>
              <h2 className="mb-1 px-1 text-body-sm text-secondary capitalize">
                {kind.replace("-", " ")}
              </h2>
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <CapabilityRow
                    key={item.id}
                    item={item}
                    selected={selectedCapabilityId === item.id}
                    onSelect={() => setSelectedCapabilityId(item.id)}
                    onToggle={() => {
                      if (tab.id === 1 && !item.enabled) {
                        addCatalogCapability(item);
                      } else {
                        toggleCapability(item.id);
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-body-md text-secondary">
              {tab.id === 0
                ? "No active capabilities match your search."
                : "No catalog items match your search."}
            </p>
          )}
        </div>
      </div>
      {showSearch ? (
        <div className={searchClassName}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
      ) : null}
    </div>
  );
};

export default CapabilityExplorer;
