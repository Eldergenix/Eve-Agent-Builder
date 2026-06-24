import { NextResponse } from "next/server";

import { fetchSkillsShDetail } from "@/lib/skills-sh/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";

  if (!id.includes("/")) {
    return NextResponse.json(
      { error: "invalid_id", message: "Skill id must be in owner/repo/slug format." },
      { status: 400 },
    );
  }

  try {
    const result = await fetchSkillsShDetail(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "skills.sh detail fetch failed";
    const status = message.includes("404") ? 404 : 502;
    return NextResponse.json({ error: "upstream_error", message }, { status });
  }
}
