import { beforeEach, describe, expect, it } from "vitest";

import { useBuilderStore } from "@/store/agent-builder-store";

describe("agent builder store deployment services", () => {
  beforeEach(() => {
    useBuilderStore.getState().resetProject();
  });

  it("does not enable Cloudflare-only services for non-Cloudflare targets", () => {
    const store = useBuilderStore.getState();

    store.setDeployMode("vercel");
    store.setServiceProviderEnabled("cloudflare-d1", true);

    expect(useBuilderStore.getState().serviceProviders).not.toContain("cloudflare-d1");
  });

  it("keeps Cloudflare services only while the Cloudflare target is selected", () => {
    const store = useBuilderStore.getState();

    store.setDeployMode("cloudflare");
    store.setServiceProviderEnabled("cloudflare-d1", true);
    expect(useBuilderStore.getState().serviceProviders).toContain("cloudflare-d1");

    useBuilderStore.getState().setDeployMode("docker");
    expect(useBuilderStore.getState().serviceProviders).not.toContain("cloudflare-d1");
  });
});
