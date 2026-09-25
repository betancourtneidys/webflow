"use client";

import { useState } from "react";
import { getIncident, nextIncident } from "@/lib/incidents";
import { formatElapsed } from "@/lib/format";
import { recordSolve } from "@/lib/progress";
import { IncidentBrief } from "./IncidentBrief";
import { ResolvedScreen } from "./ResolvedScreen";
import { Workspace } from "./Workspace";

type Phase =
  | { name: "brief" }
  | { name: "investigate"; startedAt: number }
  | {
      name: "resolved";
      elapsed: string;
      evidence: number;
      attempts: number;
      record: "first" | "best" | null;
    };

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
        record={phase.record}
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
      onResolved={(result) => {
        const ms = Date.now() - startedAt;
        setPhase({
          name: "resolved",
          elapsed: formatElapsed(ms),
          record: recordSolve(incident.id, ms),
          ...result,
        });
      }}
    />
  );
}
