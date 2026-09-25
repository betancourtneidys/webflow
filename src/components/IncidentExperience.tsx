"use client";

import { useState } from "react";
import { getIncident, nextIncident } from "@/lib/incidents";
import { IncidentBrief } from "./IncidentBrief";
import { ResolvedScreen } from "./ResolvedScreen";
import { Workspace, formatElapsed } from "./Workspace";

type Phase =
  | { name: "brief" }
  | { name: "investigate"; startedAt: number }
  | { name: "resolved"; elapsed: string; evidence: number; attempts: number };

export function IncidentExperience({ id }: { id: string }) {
  const incident = getIncident(id)!;
  const [phase, setPhase] = useState<Phase>({ name: "brief" });
  const [run, setRun] = useState(0);

  const investigate = () => setPhase({ name: "investigate", startedAt: Date.now() });

  if (phase.name === "brief") {
    return <IncidentBrief incident={incident} onInvestigate={investigate} />;
  }

  if (phase.name === "resolved") {
    return (
      <ResolvedScreen
        incident={incident}
        next={nextIncident(incident.id)}
        elapsed={phase.elapsed}
        evidence={phase.evidence}
        attempts={phase.attempts}
        onReplay={() => {
          setRun((r) => r + 1);
          setPhase({ name: "brief" });
        }}
      />
    );
  }

  const { startedAt } = phase;
  return (
    <Workspace
      key={run}
      incident={incident}
      startedAt={startedAt}
      onResolved={(result) =>
        setPhase({ name: "resolved", elapsed: formatElapsed(Date.now() - startedAt), ...result })
      }
    />
  );
}
