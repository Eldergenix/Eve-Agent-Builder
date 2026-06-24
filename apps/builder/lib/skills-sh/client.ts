import type {
  SkillsShSearchResponse,
  SkillsShSkill,
  SkillsShSkillDetail,
  SkillsShSkillFile,
} from "@/lib/skills-sh/types";

/** Public skills.sh endpoints used by the `skills` CLI — no OIDC required. */
const SKILLS_SH_BASE = process.env.SKILLS_API_URL?.replace(/\/$/, "") ?? "https://skills.sh";

type PublicSearchSkill = {
  id: string;
  skillId?: string;
  name: string;
  source: string;
  installs: number;
};

type PublicSearchResponse = {
  query: string;
  searchType: "fuzzy" | "semantic";
  skills: PublicSearchSkill[];
  count: number;
  duration_ms?: number;
};

type PublicDownloadResponse = {
  files: SkillsShSkillFile[];
  hash?: string | null;
};

export function parseSkillsShId(id: string): {
  owner: string;
  repo: string;
  slug: string;
  source: string;
} {
  const parts = id.split("/");
  if (parts.length < 3) {
    throw new Error("Skill id must be in owner/repo/slug format.");
  }

  const owner = parts[0];
  const repo = parts[1];
  const slug = parts.slice(2).join("/");
  return {
    owner,
    repo,
    slug,
    source: `${owner}/${repo}`,
  };
}

function listingFromPublicSkill(skill: PublicSearchSkill): SkillsShSkill {
  const slug = skill.skillId ?? skill.name;
  return {
    id: skill.id,
    slug,
    name: skill.name,
    source: skill.source,
    installs: skill.installs,
    sourceType: "github",
    installUrl: `https://github.com/${skill.source}`,
    url: `https://skills.sh/${skill.id}`,
  };
}

async function parseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = (await response.json()) as T | { message?: string; error?: string };
  if (!response.ok) {
    const message =
      (body as { message?: string }).message ??
      (body as { error?: string }).error ??
      `${fallbackMessage} (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

/** Search the skills.sh catalog via the public search API. */
export async function searchSkillsSh(query: string, limit = 20): Promise<SkillsShSearchResponse> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(Math.max(1, Math.min(limit, 200))),
  });

  const response = await fetch(`${SKILLS_SH_BASE}/api/search?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  const payload = await parseJson<PublicSearchResponse>(response, "skills.sh search failed");
  const started = Date.now();

  return {
    data: payload.skills.map(listingFromPublicSkill),
    query: payload.query,
    searchType: payload.searchType,
    count: payload.count,
    durationMs: payload.duration_ms ?? Date.now() - started,
  };
}

/** Fetch skill files via the public download API. */
export async function fetchSkillsShDetail(id: string): Promise<SkillsShSkillDetail> {
  const { owner, repo, slug, source } = parseSkillsShId(id);
  const response = await fetch(
    `${SKILLS_SH_BASE}/api/download/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    },
  );

  const payload = await parseJson<PublicDownloadResponse>(response, "skills.sh download failed");

  return {
    id,
    source,
    slug,
    installs: 0,
    hash: payload.hash ?? null,
    files: payload.files ?? null,
  };
}
