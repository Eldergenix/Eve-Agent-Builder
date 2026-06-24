"use client";

import { useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";

import Button from "@/components/Button";
import Icon from "@/components/Icon";
import Select from "@/components/Select";
import ModelSelect from "@/components/ModelSelect";
import ViewController from "@/components/ViewController";
import { useConfigFormNavigation } from "@/hooks/use-config-form-navigation";
import { useGatewayModels } from "@/hooks/use-gateway-models";
import { useBuilderStore } from "@/store/agent-builder-store";

const modes = [
  { id: 0, name: "Chat" },
  { id: 1, name: "Task" },
];

const PanelMessage = () => {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState(modes[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formNavigation = useConfigFormNavigation();
  const { options: gatewayModels, isLoading: modelsLoading } = useGatewayModels();
  const model = useBuilderStore((s) => s.model);
  const setModel = useBuilderStore((s) => s.setModel);
  const setInstructions = useBuilderStore((s) => s.setInstructions);
  const instructions = useBuilderStore((s) => s.instructions);
  const isMessage = message.trim().length > 0;

  function handleSubmit() {
    if (!isMessage) return;
    const prefix = mode.id === 1 ? "## Task mode\n\n" : "";
    setInstructions(`${instructions.trim()}\n\n${prefix}${message.trim()}`);
    setMessage("");
  }

  function handleAttachment(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result).trim();
      if (!text) return;
      setInstructions(`${instructions.trim()}\n\n${text}`);
    };
    reader.readAsText(file);
  }

  return (
    <section
      className="fixed bottom-3 left-1/2 z-10 w-135.5 -translate-x-1/2 rounded-3xl border border-s-01 bg-surface-01 p-3 pt-5 shadow-prompt-input"
      aria-label="Agent instructions composer"
    >
      <ViewController {...formNavigation} />
      <label className="sr-only" htmlFor="agent-prompt">
        Describe what your agent should do
      </label>
      <TextareaAutosize
        id="agent-prompt"
        className="mb-8 !h-6 w-full resize-none bg-transparent pl-2 text-title text-primary outline-none placeholder:text-secondary focus-visible:ring-2 focus-visible:ring-primary/20"
        maxRows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe what your agent should do…"
        name="agent-prompt"
        autoComplete="off"
        spellCheck
      />
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,text/plain,text/markdown"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAttachment(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-s-02 transition-colors hover:bg-surface-03 focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label="Add attachment"
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon className="!size-5 fill-primary" name="plus" aria-hidden="true" />
        </button>
        <Select
          className="min-w-38.5 mr-auto"
          classButton="!rounded-xl !text-heading"
          classIcon="!mr-3 !fill-green"
          icon="flash"
          value={mode}
          onChange={setMode}
          options={modes}
          isWhite
        />
        <ModelSelect
          className="min-w-44"
          classButton="!rounded-xl !text-heading"
          value={model}
          onChange={setModel}
          options={gatewayModels}
          isLoading={modelsLoading}
          isWhite
        />
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-surface-03 focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label="Voice input unavailable"
          disabled
          title="Voice input is not available in the builder preview"
        >
          <Icon className="!size-5 fill-primary opacity-40" name="microphone" aria-hidden="true" />
        </button>
        <Button
          className="w-10 !p-0"
          isPrimary={!isMessage}
          isSecondary={isMessage}
          aria-label={isMessage ? "Update instructions" : "Submit prompt"}
          onClick={handleSubmit}
          disabled={!isMessage}
        >
          <Icon className="-rotate-90 fill-inherit" name="arrow" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
};

export default PanelMessage;
