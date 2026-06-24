import { Suspense } from "react";

import AgentBuilderLayout from "@/components/builder/AgentBuilderLayout";
import BuilderShell from "@/components/builder/BuilderShell";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BuilderShell>
        <AgentBuilderLayout />
      </BuilderShell>
    </Suspense>
  );
}
