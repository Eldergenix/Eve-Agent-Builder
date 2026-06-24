"use client";

import { type FormEvent, useRef } from "react";
import { useEveAgent } from "eve/react";

type MessagePart = ReturnType<typeof useEveAgent>["data"]["messages"][number]["parts"][number];

export default function Page() {
  const formRef = useRef<HTMLFormElement>(null);
  const agent = useEveAgent();
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();
    if (!message || isBusy) return;
    formRef.current?.reset();
    await agent.send({ message });
  }

  return (
    <main className="shell">
      <section className="chat" aria-label="Agent chat">
        <header className="chatHeader">
          <div>
            <p className="eyebrow">eve agent</p>
            <h1>Chat</h1>
          </div>
          <span className="status">{agent.status}</span>
        </header>

        <div className="messages" aria-live="polite">
          {agent.data.messages.length === 0 ? (
            <div className="empty">Start a conversation with this agent.</div>
          ) : (
            agent.data.messages.map((message) => (
              <article className={`message message--${message.role}`} key={message.id}>
                <p className="role">{message.role}</p>
                {message.parts.map(renderPart)}
              </article>
            ))
          )}
          {agent.error ? <p className="error">{agent.error.message}</p> : null}
        </div>

        <form className="composer" ref={formRef} onSubmit={onSubmit}>
          <label className="srOnly" htmlFor="message">
            Message
          </label>
          <textarea id="message" name="message" placeholder="Send a message..." disabled={isBusy} />
          <button type="submit" disabled={isBusy}>
            {isBusy ? "Working" : "Send"}
          </button>
        </form>
      </section>
    </main>
  );
}

function renderPart(part: MessagePart, index: number) {
  if (part.type === "text") return <p key={`text:${index}`}>{part.text}</p>;
  if (part.type === "reasoning") {
    return (
      <details className="reasoning" key={`reasoning:${index}`}>
        <summary>Reasoning</summary>
        <p>{part.text}</p>
      </details>
    );
  }
  if (part.type === "dynamic-tool") {
    return (
      <details className="tool" key={part.toolCallId}>
        <summary>{part.toolName}</summary>
        <pre>{JSON.stringify({ input: part.input, output: part.output }, null, 2)}</pre>
      </details>
    );
  }
  return null;
}
