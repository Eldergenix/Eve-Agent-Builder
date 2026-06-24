import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultProject } from "@/lib/agent-config/defaults";
import {
  deployInstructions,
  navigateReservedDeploymentWindow,
  reserveDeploymentWindow,
} from "@/lib/export-project";

type ReservedWindowStub = Pick<Window, "closed" | "close" | "opener"> & {
  location: Pick<Location, "href">;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("deployInstructions", () => {
  it("includes the Docker fast path in copied share instructions", () => {
    const instructions = deployInstructions(
      {
        ...createDefaultProject(),
        deployMode: "docker",
        serviceProviders: ["upstash"],
      },
      "docker",
    );

    expect(instructions).toContain("Fast path:");
    expect(instructions).toContain("cp .env.example .env.local");
    expect(instructions).toContain("docker compose up --build");
    expect(instructions).toContain("UPSTASH_REDIS_REST_URL");
  });

  it("includes the selected hosted deploy button in copied share instructions", () => {
    const instructions = deployInstructions(
      {
        ...createDefaultProject(),
        deployMode: "vercel",
        repositoryUrl: "https://github.com/acme/agent",
      },
      "vercel",
    );

    expect(instructions).toContain("Fast path:");
    expect(instructions).toContain("Deploy with Vercel");
    expect(instructions).toContain("https://vercel.com/new/clone?");
  });
});

describe("deployment window reservation", () => {
  it("reserves a popup synchronously for hosted deployment targets", () => {
    const reservedWindow = {
      closed: false,
      close: vi.fn(),
      location: { href: "about:blank" },
      opener: {},
    };
    const open = vi.fn(() => reservedWindow);
    vi.stubGlobal("window", { open });

    expect(reserveDeploymentWindow("vercel")).toBe(reservedWindow);
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(reservedWindow.opener).toBeNull();
  });

  it("does not reserve a popup for manual Docker exports", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });

    expect(reserveDeploymentWindow("docker")).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it("navigates the reserved popup after deployment preparation finishes", () => {
    const close = vi.fn();
    const reservedWindow: ReservedWindowStub = {
      closed: false,
      close,
      location: { href: "about:blank" },
      opener: null,
    };

    expect(
      navigateReservedDeploymentWindow(
        reservedWindow as Window,
        "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Facme%2Fagent",
      ),
    ).toBe(true);
    expect(reservedWindow.location.href).toBe(
      "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Facme%2Fagent",
    );
    expect(close).not.toHaveBeenCalled();
  });

  it("closes the reserved popup when no launch URL exists", () => {
    const close = vi.fn();
    const reservedWindow: ReservedWindowStub = {
      closed: false,
      close,
      location: { href: "about:blank" },
      opener: null,
    };

    expect(navigateReservedDeploymentWindow(reservedWindow as Window, null)).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
