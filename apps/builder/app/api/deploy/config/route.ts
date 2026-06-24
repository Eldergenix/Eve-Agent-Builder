import { NextResponse } from "next/server";

import { decodeDeploymentConfig } from "@/lib/agent-config/deployment-config-url";

export async function GET(request: Request) {
  const payload = new URL(request.url).searchParams.get("payload");
  if (!payload) {
    return NextResponse.json({ error: "Missing deployment config payload." }, { status: 400 });
  }

  try {
    return NextResponse.json(decodeDeploymentConfig(payload), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid deployment config payload." }, { status: 400 });
  }
}
