import JSZip from "jszip";
import { NextResponse } from "next/server";

import { normalizeAgentProjectConfig } from "@/lib/agent-config/defaults";
import { generateProjectFiles, projectReadme } from "@/lib/agent-config/generate-files";

export async function POST(request: Request) {
  const config = normalizeAgentProjectConfig(await request.json());
  const files = generateProjectFiles(config);
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  zip.file("README.md", projectReadme(config));

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${config.name}.zip"`,
    },
  });
}
