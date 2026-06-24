"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/Button";
import Icon from "@/components/Icon";
import SearchBar from "@/components/SearchBar";
import { capabilityFromSkillsSh, isSkillsShSkill } from "@/lib/skills-sh/skill-capability";
import type {
  SkillsShSearchResponse,
  SkillsShSkill,
  SkillsShSkillDetail,
} from "@/lib/skills-sh/types";
import { useBuilderStore } from "@/store/agent-builder-store";

const MIN_QUERY_LENGTH = 2;

function formatInstalls(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toLocaleString();
}

const AgentSkillsStep = () => {
  const capabilities = useBuilderStore((s) => s.capabilities);
  const addCatalogCapability = useBuilderStore((s) => s.addCatalogCapability);
  const removeSkill = useBuilderStore((s) => s.removeSkill);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SkillsShSkill[]>([]);
  const [searchType, setSearchType] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  const installedSkills = useMemo(
    () =>
      capabilities.filter((item) => item.kind === "skill" && item.enabled && isSkillsShSkill(item)),
    [capabilities],
  );

  const installedIds = useMemo(
    () => new Set(installedSkills.map((skill) => skill.skillsShId).filter(Boolean)),
    [installedSkills],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchType(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({ q: debouncedQuery, limit: "12" });
        const response = await fetch(`/api/skills/search?${params}`, { signal: controller.signal });
        const body = (await response.json()) as SkillsShSearchResponse | { message?: string };

        if (!response.ok) {
          throw new Error("message" in body && body.message ? body.message : "Search failed");
        }

        const payload = body as SkillsShSearchResponse;
        setResults(payload.data.filter((skill) => !skill.isDuplicate));
        setSearchType(payload.searchType);
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchType(null);
        setSearchError(error instanceof Error ? error.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  const installSkill = useCallback(
    async (listing: SkillsShSkill) => {
      if (installedIds.has(listing.id)) return;

      setInstallingId(listing.id);
      setInstallError(null);

      try {
        const params = new URLSearchParams({ id: listing.id });
        const response = await fetch(`/api/skills/detail?${params}`);
        const body = (await response.json()) as SkillsShSkillDetail | { message?: string };

        if (!response.ok) {
          throw new Error(
            "message" in body && body.message ? body.message : "Could not load skill",
          );
        }

        addCatalogCapability(capabilityFromSkillsSh(listing, body as SkillsShSkillDetail));
      } catch (error) {
        setInstallError(error instanceof Error ? error.message : "Could not add skill");
      } finally {
        setInstallingId(null);
      }
    },
    [addCatalogCapability, installedIds],
  );

  return (
    <div className="mt-3 flex min-h-0 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 rounded-xl border border-s-01 bg-surface-03/60 p-3">
        <SearchBar className="bg-surface-01" value={query} onChange={setQuery} />
        <p className="mt-1.5 text-body-sm text-secondary">
          Search the{" "}
          <a
            className="text-primary underline-offset-2 hover:underline"
            href="https://skills.sh"
            target="_blank"
            rel="noreferrer"
          >
            skills.sh
          </a>{" "}
          catalog. Added skills export as{" "}
          <code className="text-body-sm text-primary">agent/skills/</code> files.
        </p>
      </div>

      {debouncedQuery.length >= MIN_QUERY_LENGTH ? (
        <div className="shrink-0 overflow-hidden rounded-xl border border-s-01 bg-surface-03/60">
          <div className="flex items-center justify-between border-b border-s-01 px-3 py-2">
            <p className="text-body-sm text-secondary">
              {isSearching
                ? "Searching…"
                : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </p>
            {searchType ? <p className="text-body-sm text-secondary">{searchType} search</p> : null}
          </div>

          {searchError ? (
            <p className="px-3 py-3 text-body-sm text-secondary">{searchError}</p>
          ) : results.length === 0 && !isSearching ? (
            <p className="px-3 py-3 text-body-sm text-secondary">
              No skills found for “{debouncedQuery}”.
            </p>
          ) : (
            <ul className="max-h-40 divide-y divide-s-01 overflow-y-auto">
              {results.map((skill) => {
                const isInstalled = installedIds.has(skill.id);
                const isInstalling = installingId === skill.id;

                return (
                  <li key={skill.id} className="flex items-start gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md-str text-primary">{skill.name}</p>
                      <p className="truncate text-body-sm text-secondary">{skill.source}</p>
                      <p className="mt-0.5 text-body-sm text-secondary">
                        {formatInstalls(skill.installs)} installs
                      </p>
                    </div>
                    <Button
                      type="button"
                      isSecondary
                      className="shrink-0"
                      disabled={isInstalled || isInstalling}
                      onClick={() => void installSkill(skill)}
                    >
                      {isInstalled ? "Added" : isInstalling ? "Adding…" : "Add"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {installError ? <p className="text-body-sm text-secondary">{installError}</p> : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-body-md-str text-primary">Installed skills</h3>
          <span className="text-body-sm text-secondary">{installedSkills.length} selected</span>
        </div>

        {installedSkills.length === 0 ? (
          <p className="rounded-xl border border-dashed border-s-01 px-3 py-4 text-body-sm text-secondary">
            No skills added yet. Search above to install SKILL.md packages from skills.sh.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-s-01 overflow-y-auto rounded-xl border border-s-01 bg-surface-03/60">
            {installedSkills.map((skill) => (
              <li key={skill.id} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-01">
                  <Icon className="!size-4 fill-secondary" name="bulb" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md-str text-primary">{skill.name}</p>
                  <p className="line-clamp-2 text-body-sm text-secondary">{skill.description}</p>
                  {skill.skillsShUrl ? (
                    <a
                      className="mt-0.5 inline-block truncate text-body-sm text-secondary underline-offset-2 hover:text-primary hover:underline"
                      href={skill.skillsShUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {skill.skillsShId}
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1 text-body-sm text-secondary transition-colors hover:bg-surface-01 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  onClick={() => removeSkill(skill.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AgentSkillsStep;
