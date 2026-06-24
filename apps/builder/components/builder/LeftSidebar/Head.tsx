"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import EveLogoSymbol from "@/components/EveLogoSymbol";
import Icon from "@/components/Icon";
import type { AgentProjectConfig } from "@/lib/agent-config/defaults";
import { useBuilderStore } from "@/store/agent-builder-store";

type Props = {
  idPrefix?: string;
  rightContent?: ReactNode;
  toolbarContent?: ReactNode;
};

const Head = ({ idPrefix = "agent", rightContent, toolbarContent }: Props) => {
  const name = useBuilderStore((s) => s.name);
  const description = useBuilderStore((s) => s.description);
  const setName = useBuilderStore((s) => s.setName);
  const setDescription = useBuilderStore((s) => s.setDescription);
  const resetProject = useBuilderStore((s) => s.resetProject);
  const importProject = useBuilderStore((s) => s.importProject);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AgentProjectConfig;
        if (!parsed.name || !Array.isArray(parsed.capabilities)) {
          throw new Error("Invalid project file");
        }
        importProject(parsed);
      } catch {
        window.alert("Could not import project. Use a valid agent config JSON file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="border-b border-s-01 p-4 pb-3">
      <div className="mb-3 flex items-center justify-between">
        <EveLogoSymbol className="size-8 shrink-0 text-primary" />
        <div className="flex items-center gap-1">
          {toolbarContent}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          <button
            className="btn-icon size-8 focus-visible:ring-2 focus-visible:ring-primary/20"
            type="button"
            aria-label="Import project"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="folder-add" aria-hidden="true" />
          </button>
          <button
            className="btn-icon size-8 focus-visible:ring-2 focus-visible:ring-primary/20"
            type="button"
            aria-label="Reset project"
            onClick={() => {
              if (window.confirm("Reset project to defaults? This cannot be undone.")) {
                resetProject();
              }
            }}
          >
            <Icon name="repeat" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className={
          rightContent ? "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" : ""
        }
      >
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`${idPrefix}-name`}>
            Agent name
          </label>
          <div className="relative">
            <Icon
              className="pointer-events-none absolute left-0 top-1/2 !size-3.5 -translate-y-1/2 fill-secondary/70"
              name="edit"
              aria-hidden="true"
            />
            <input
              id={`${idPrefix}-name`}
              className="w-full truncate bg-transparent pl-5 text-title-str text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              name="agent-name"
            />
          </div>
          <label className="sr-only" htmlFor={`${idPrefix}-description`}>
            Agent description
          </label>
          <input
            id={`${idPrefix}-description`}
            className="mt-0.5 w-full bg-transparent text-body-md text-secondary/80 outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            name="agent-description"
          />
        </div>
        {rightContent ? <div className="w-full shrink-0 sm:w-80">{rightContent}</div> : null}
      </div>
    </div>
  );
};

export default Head;
