import { NextResponse } from "next/server";

import { searchSkillsSh } from "@/lib/skills-sh/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Number(searchParams.get("limit") ?? "20");

  if (query.length < 2) {
    return NextResponse.json(
      { error: "invalid_query", message: "Search query must be at least 2 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await searchSkillsSh(query, limit);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "skills.sh search failed";
    return NextResponse.json({ error: "upstream_error", message }, { status: 502 });
  }
}
