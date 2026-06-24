"use client";

import { useMemo } from "react";

import AgentConfigForm from "@/components/builder/CenterPreview/AgentConfigForm";
import { deploymentActions } from "@/lib/agent-config/deployment";
import { generateProjectFiles } from "@/lib/agent-config/generate-files";
import { useProjectConfig, useBuilderStore } from "@/store/agent-builder-store";

function FilesPanel() {
  const config = useProjectConfig();
  const files = useMemo(() => generateProjectFiles(config), [config]);
  const paths = Object.keys(files).sort();

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-3 scrollbar-none sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {paths.map((path) => (
          <details
            key={path}
            className="overflow-hidden rounded-2xl border border-s-01 bg-surface-01 shadow-depth-01"
          >
            <summary className="cursor-pointer px-4 py-3 text-body-md-str text-primary">
              {path}
            </summary>
            <pre className="overflow-x-auto whitespace-pre-wrap px-4 pb-4 text-body-sm text-secondary">
              {files[path]}
            </pre>
          </details>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel() {
  const config = useProjectConfig();
  const deployMode = useBuilderStore((s) => s.deployMode);
  const deployment = useMemo(() => deploymentActions(config)[deployMode], [config, deployMode]);

  return (
    <div className="flex h-full items-center justify-center p-3 sm:p-8">
      <div className="w-full max-w-lg rounded-3xl border border-s-01 bg-surface-01 p-5 text-center shadow-popover sm:p-8">
        <div className="mb-3 text-h5 text-balance text-primary">Agent preview</div>
        <p className="mb-6 text-p-md text-secondary">
          Export and run <code className="text-body-md-str">pnpm dev</code> to chat with{" "}
          <strong translate="no">{config.name}</strong> using the configured model and capabilities.
        </p>
        <div className="mb-4 rounded-2xl bg-surface-03 p-4 text-left text-body-md text-secondary">
          <p className="mb-2 text-body-md-str text-primary">{deployment.label}</p>
          <ol className="list-decimal space-y-2 pl-5 text-body-sm">
            {deployment.steps.slice(0, 4).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-2xl bg-surface-03 p-4 text-left text-body-md text-secondary">
          {config.instructions.slice(0, 400)}
          {config.instructions.length > 400 ? "…" : ""}
        </div>
      </div>
    </div>
  );
}

const CenterPreview = () => {
  const centerView = useBuilderStore((s) => s.centerView);

  return (
    <main
      className="relative h-[calc(100dvh-5.75rem)] min-h-[32rem] overflow-hidden rounded-[1.25rem] border border-s-01 bg-surface-02 min-[1341px]:fixed min-[1341px]:top-0 min-[1341px]:right-63 min-[1341px]:bottom-0 min-[1341px]:left-63 min-[1341px]:h-auto min-[1341px]:min-h-0 min-[1341px]:rounded-none min-[1341px]:border-0"
      id="main-content"
    >
      {centerView === "spec" && <AgentConfigForm />}
      {centerView === "files" && <FilesPanel />}
      {centerView === "preview" && <PreviewPanel />}
    </main>
  );
};

export default CenterPreview;
