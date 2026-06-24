export type SkillsShSkill = {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: "github" | "well-known" | string;
  installUrl: string | null;
  url: string;
  isDuplicate?: boolean;
};

export type SkillsShSearchResponse = {
  data: SkillsShSkill[];
  query: string;
  searchType: "fuzzy" | "semantic";
  count: number;
  durationMs: number;
};

export type SkillsShSkillFile = {
  path: string;
  contents: string;
};

export type SkillsShSkillDetail = {
  id: string;
  source: string;
  slug: string;
  installs: number;
  hash: string | null;
  files: SkillsShSkillFile[] | null;
};

export type SkillsShApiError = {
  error: string;
  message: string;
};
