"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

import CapabilityExplorer from "@/components/builder/CapabilityExplorer";
import EveLogoSymbol from "@/components/EveLogoSymbol";
import Icon from "@/components/Icon";
import Head from "./Head";

type Props = {
  collapsed: boolean;
  width: number;
  onToggleCollapsed: () => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeKey: (direction: -1 | 1) => void;
};

const LeftSidebar = ({
  collapsed,
  width,
  onToggleCollapsed,
  onResizeStart,
  onResizeKey,
}: Props) => {
  const style = { "--sidebar-width": `${width}px` } as CSSProperties;
  const collapseLabel = collapsed ? "Expand capabilities sidebar" : "Collapse capabilities sidebar";

  return (
    <aside
      className={`sidebar sidebar--left flex flex-col ${collapsed ? "items-center p-2" : ""}`}
      style={style}
      aria-label="Agent capabilities"
    >
      {collapsed ? (
        <>
          <EveLogoSymbol className="size-8 shrink-0 text-primary" />
          <button
            className="btn-icon mt-2 size-8 focus-visible:ring-2 focus-visible:ring-primary/20"
            type="button"
            aria-label={collapseLabel}
            title={collapseLabel}
            onClick={onToggleCollapsed}
          >
            <Icon className="!size-4" name="arrow" aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <Head
            toolbarContent={
              <button
                className="btn-icon size-8 focus-visible:ring-2 focus-visible:ring-primary/20"
                type="button"
                aria-label={collapseLabel}
                title={collapseLabel}
                onClick={onToggleCollapsed}
              >
                <Icon className="!size-4 rotate-180" name="arrow" aria-hidden="true" />
              </button>
            }
          />
          <CapabilityExplorer className="grow" />
          <div
            className="sidebar__resize-handle sidebar__resize-handle--right"
            role="separator"
            aria-label="Resize capabilities sidebar"
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={onResizeStart}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") onResizeKey(-1);
              if (event.key === "ArrowRight") onResizeKey(1);
            }}
          />
        </>
      )}
    </aside>
  );
};

export default LeftSidebar;
