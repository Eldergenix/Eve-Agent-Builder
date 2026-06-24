"use client";

import { type CSSProperties, type PointerEvent as ReactPointerEvent, useState } from "react";

import CenterPreview from "@/components/builder/CenterPreview";
import LeftSidebar from "@/components/builder/LeftSidebar";
import PanelMessage from "@/components/builder/PanelMessage";
import RightSidebar from "@/components/builder/RightSidebar";

const SHOW_PROMPT_PANEL = false;
const DEFAULT_SIDEBAR_WIDTH = 240;
const COLLAPSED_SIDEBAR_WIDTH = 52;
const MIN_SIDEBAR_WIDTH = 208;
const MAX_SIDEBAR_WIDTH = 360;

type SidebarSide = "left" | "right";

function clampSidebarWidth(value: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value));
}

const AgentBuilderLayout = () => {
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const leftVisibleWidth = leftSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : leftSidebarWidth;
  const rightVisibleWidth = rightSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : rightSidebarWidth;
  const shellStyle = {
    "--builder-left-sidebar-space": `${leftVisibleWidth}px`,
    "--builder-right-sidebar-space": `${rightVisibleWidth}px`,
  } as CSSProperties;

  function handleResizeStart(side: SidebarSide, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = side === "left" ? leftSidebarWidth : rightSidebarWidth;
    const originalCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth =
        side === "left"
          ? clampSidebarWidth(startWidth + delta)
          : clampSidebarWidth(startWidth - delta);
      if (side === "left") {
        setLeftSidebarWidth(nextWidth);
      } else {
        setRightSidebarWidth(nextWidth);
      }
    };

    const stopResize = () => {
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function handleResizeKey(side: SidebarSide, direction: -1 | 1) {
    if (side === "left") {
      setLeftSidebarWidth((width) => clampSidebarWidth(width + direction * 16));
    } else {
      setRightSidebarWidth((width) => clampSidebarWidth(width + direction * 16));
    }
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-surface-01 focus:px-4 focus:py-2 focus:shadow-toolbar focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        Skip to main content
      </a>
      <div className="builder-shell" style={shellStyle}>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-3 pb-4 pt-3 sm:px-4 min-[1341px]:contents min-[1341px]:p-0">
          <CenterPreview />
          <div className="hidden min-[1341px]:contents">
            <LeftSidebar
              collapsed={leftSidebarCollapsed}
              width={leftVisibleWidth}
              onToggleCollapsed={() => setLeftSidebarCollapsed((collapsed) => !collapsed)}
              onResizeStart={(event) => handleResizeStart("left", event)}
              onResizeKey={(direction) => handleResizeKey("left", direction)}
            />
            {SHOW_PROMPT_PANEL ? <PanelMessage /> : null}
            <RightSidebar
              collapsed={rightSidebarCollapsed}
              width={rightVisibleWidth}
              onToggleCollapsed={() => setRightSidebarCollapsed((collapsed) => !collapsed)}
              onResizeStart={(event) => handleResizeStart("right", event)}
              onResizeKey={(direction) => handleResizeKey("right", direction)}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AgentBuilderLayout;
