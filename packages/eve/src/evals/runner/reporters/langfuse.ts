import type { EveEval, EveEvalResult, EveEvalRunSummary, EveEvalTarget } from "#evals/types.js";
import type { EvalReporter } from "#evals/runner/reporters/types.js";

/**
 * Configuration for the Langfuse reporter. Langfuse credentials are read by
 * `@langfuse/client` from the standard LANGFUSE_* environment variables.
 */
export interface LangfuseReporterConfig {
  /**
   * Human-readable run name included in score comments.
   */
  readonly runName?: string;
}

interface LangfuseSdk {
  readonly LangfuseClient: new () => LangfuseClient;
}

interface LangfuseClient {
  readonly score: {
    create(input: LangfuseScoreInput): void | Promise<void>;
  };
  flush(): Promise<void>;
}

interface LangfuseScoreInput {
  readonly id?: string;
  readonly sessionId: string;
  readonly name: string;
  readonly value: number;
  readonly dataType: "NUMERIC";
  readonly comment?: string;
}

/**
 * Creates an {@link EvalReporter} that uploads Eve eval assertion scores to
 * Langfuse as session-level scores. Add it to `evals.config.ts` so one
 * reporter observes the whole eval run.
 */
export function Langfuse(config: LangfuseReporterConfig = {}): EvalReporter {
  return new LangfuseReporter(config);
}

class LangfuseReporter implements EvalReporter {
  readonly #config: LangfuseReporterConfig;
  #client: LangfuseClient | undefined;
  readonly #evaluations = new Map<string, EveEval>();
  #target: EveEvalTarget | undefined;

  constructor(config: LangfuseReporterConfig) {
    this.#config = config;
  }

  async onRunStart(evaluations: readonly EveEval[], target: EveEvalTarget): Promise<void> {
    const sdk = await loadLangfuseSdk();
    this.#client = new sdk.LangfuseClient();
    this.#target = target;
    this.#evaluations.clear();
    for (const evaluation of evaluations) {
      this.#evaluations.set(evaluation.id, evaluation);
    }
  }

  async onEvalComplete(result: EveEvalResult): Promise<void> {
    if (!this.#client || !result.result.sessionId) return;

    const evaluation = this.#evaluations.get(result.id);
    for (const assertion of result.assertions) {
      await this.#client.score.create({
        id: scoreId(result, assertion.name),
        sessionId: result.result.sessionId,
        name: assertion.severity === "gate" ? `gate:${assertion.name}` : assertion.name,
        value: assertion.score,
        dataType: "NUMERIC",
        comment: scoreComment({
          evalId: result.id,
          runName: this.#config.runName,
          target: this.#target,
          verdict: result.verdict,
          description: evaluation?.description,
          message: assertion.message,
        }),
      });
    }
  }

  async onRunComplete(_summary: EveEvalRunSummary): Promise<void> {
    if (!this.#client) return;
    try {
      await this.#client.flush();
    } finally {
      this.#client = undefined;
      this.#target = undefined;
      this.#evaluations.clear();
    }
  }
}

const LANGFUSE_CLIENT_PACKAGE = "@langfuse/client";

async function loadLangfuseSdk(): Promise<LangfuseSdk> {
  try {
    return (await import(LANGFUSE_CLIENT_PACKAGE)) as LangfuseSdk;
  } catch {
    throw new Error(
      [
        "The '@langfuse/client' package is required for Langfuse reporting but was not found.",
        "",
        "Install it with:",
        "  npm install @langfuse/client",
      ].join("\n"),
    );
  }
}

function scoreId(result: EveEvalResult, assertionName: string): string {
  const session = result.result.sessionId ?? "no-session";
  return ["eve", result.id, session, assertionName].map(sanitizeScoreIdPart).join(":");
}

function sanitizeScoreIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]+/g, "_").slice(0, 120);
}

function scoreComment(input: {
  readonly evalId: string;
  readonly runName: string | undefined;
  readonly target: EveEvalTarget | undefined;
  readonly verdict: string;
  readonly description: string | undefined;
  readonly message: string | undefined;
}): string {
  return [
    input.runName ? `run=${input.runName}` : undefined,
    `eval=${input.evalId}`,
    `verdict=${input.verdict}`,
    input.target ? `target=${input.target.kind}` : undefined,
    input.description ? `description=${input.description}` : undefined,
    input.message ? `message=${input.message}` : undefined,
  ]
    .filter((part): part is string => Boolean(part))
    .join("; ")
    .slice(0, 500);
}
