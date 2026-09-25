import type { Incident } from "../types";
import { dbExhaustion } from "./db-exhaustion";
import { queueBacklog } from "./queue-backlog";
import { oidcTrust } from "./oidc-trust";
import { dnsWeightedLegacy } from "./dns-weighted-legacy";
import { lambdaConcurrency } from "./lambda-concurrency";
import { secretRotation } from "./secret-rotation";

// To add an incident: create a file next to these and append it here.
// Ordered roughly by difficulty; "Next incident" follows this order.
export const incidents: Incident[] = [
  dbExhaustion,
  queueBacklog,
  oidcTrust,
  dnsWeightedLegacy,
  lambdaConcurrency,
  secretRotation,
];

export function getIncident(id: string): Incident | undefined {
  return incidents.find((i) => i.id === id);
}

export function nextIncident(id: string): Incident {
  const index = incidents.findIndex((i) => i.id === id);
  return incidents[(index + 1) % incidents.length];
}
