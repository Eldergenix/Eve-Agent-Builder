"use client";

import { AGENT_TEMPLATES } from "@/lib/agent-config/agent-templates";
import { useBuilderStore } from "@/store/agent-builder-store";

const AgentTemplateStep = () => {
  const agentTemplateId = useBuilderStore((s) => s.agentTemplateId);
  const setAgentTemplate = useBuilderStore((s) => s.setAgentTemplate);

  return (
    <div className="mt-3">
      <fieldset>
        <legend className="sr-only">Agent type</legend>
        <ul className="grid max-h-60 gap-2.5 overflow-y-auto overscroll-contain pr-1 scrollbar-none sm:grid-cols-2">
          {AGENT_TEMPLATES.map((template) => {
            const selected = agentTemplateId === template.id;

            return (
              <li key={template.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 ${
                    selected
                      ? "border-s-02 bg-surface-03 shadow-depth-01"
                      : "border-s-01 bg-surface-03/40 hover:bg-surface-03"
                  }`}
                  aria-pressed={selected}
                  onClick={() => setAgentTemplate(template.id)}
                >
                  <span className="text-body-md-str text-primary">{template.label}</span>
                  <span className="mt-1 line-clamp-2 text-body-md text-secondary">
                    {template.summary}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <p className="mt-2 text-body-sm text-secondary">
        Selected:{" "}
        <span className="text-body-md-str text-primary">
          {AGENT_TEMPLATES.find((template) => template.id === agentTemplateId)?.label ?? "Custom"}
        </span>
      </p>
    </div>
  );
};

export default AgentTemplateStep;
