"use client";

import { useEffect, useState } from "react";

import type { GatewayModelOption } from "@/lib/ai-gateway/models";
import { FALLBACK_MODEL_OPTIONS } from "@/lib/ai-gateway/models";

type ModelsResponse = {
  data: GatewayModelOption[];
  source: "gateway" | "fallback";
};

export function useGatewayModels() {
  const [options, setOptions] = useState<GatewayModelOption[]>(FALLBACK_MODEL_OPTIONS);
  const [source, setSource] = useState<"gateway" | "fallback" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/models", { signal: controller.signal });
        const body = (await response.json()) as ModelsResponse;

        if (!response.ok || !Array.isArray(body.data) || body.data.length === 0) {
          throw new Error("Could not load AI Gateway models");
        }

        setOptions(body.data);
        setSource(body.source);
        setError(null);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setOptions(FALLBACK_MODEL_OPTIONS);
        setSource("fallback");
        setError(fetchError instanceof Error ? fetchError.message : "Could not load models");
      }
    })();

    return () => controller.abort();
  }, []);

  return { options, source, error, isLoading: source === "loading" };
}
