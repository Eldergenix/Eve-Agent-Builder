import { NextResponse } from "next/server";

import {
  buildGatewayModelOptions,
  FALLBACK_MODEL_OPTIONS,
  fetchGatewayCatalog,
} from "@/lib/ai-gateway/models";

export async function GET() {
  try {
    const catalog = await fetchGatewayCatalog();
    const data = buildGatewayModelOptions(catalog);
    return NextResponse.json({ data, source: "gateway" as const });
  } catch {
    return NextResponse.json({ data: FALLBACK_MODEL_OPTIONS, source: "fallback" as const });
  }
}
