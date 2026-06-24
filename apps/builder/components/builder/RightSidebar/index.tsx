"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import AgentSettingsPanel from "@/components/builder/AgentSettingsPanel";
import BuilderActions from "@/components/builder/BuilderActions";
import Icon from "@/components/Icon";
import ViewController from "@/components/ViewController";
import { useConfigFormNavigation } from "@/hooks/use-config-form-navigation";

type Props = {
  collapsed: boolean;
  width: number;
  onToggleCollapsed: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeKey: (direction: -1 | 1) => void;
};

const RightSidebar = ({
  collapsed,
  width,
  onToggleCollapsed,
  onResizeStart,
  onResizeKey,
}: Props) => {
  const formNavigation = useConfigFormNavigation();
  const style = { "--sidebar-width": `${width}px` } as CSSProperties;
  const collapseLabel = collapsed ? "Expand settings sidebar" : "Collapse settings sidebar";

  return (
    <aside
      className={`sidebar sidebar--right flex flex-col ${collapsed ? "items-center p-2" : ""}`}
      style={style}
      aria-label="Agent settings"
    >
      {collapsed ? (
        <button
          className="btn-icon size-8 focus-visible:ring-2 focus-visible:ring-primary/20"
          type="button"
          aria-label={collapseLabel}
          title={collapseLabel}
          onClick={onToggleCollapsed}
        >
          <Icon className="!size-4 rotate-180" name="arrow" aria-hidden="true" />
        </button>
      ) : (
        <>
          <div className="border-b border-s-01 p-3">
            <div className="mb-2 flex justify-end">
              <button
                className="btn-icon size-8 focus-visible:ring-2 focus-visible:ring-primary/20"
                type="button"
                aria-label={collapseLabel}
                title={collapseLabel}
                onClick={onToggleCollapsed}
              >
                <Icon className="!size-4" name="arrow" aria-hidden="true" />
              </button>
            </div>
            <BuilderActions />
          </div>
          <AgentSettingsPanel className="grow" />
          <ViewController className="hidden min-[1341px]:flex" vertical {...formNavigation} />
          <div
            className="sidebar__resize-handle sidebar__resize-handle--left"
            role="separator"
            aria-label="Resize settings sidebar"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={onResizeStart}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") onResizeKey(1);
              if (event.key === "ArrowRight") onResizeKey(-1);
            }}
          />
        </>
      )}
    </aside>
  );
};

export default RightSidebar;
