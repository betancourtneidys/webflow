import type { Incident } from "../types";
import type { Lang } from "../i18n";
import { overlay } from "../localize";
import type { IncidentTranslation } from "./es/types";
import { dbExhaustion } from "./db-exhaustion";
import { queueBacklog } from "./queue-backlog";
import { oidcTrust } from "./oidc-trust";
import { dnsWeightedLegacy } from "./dns-weighted-legacy";
import { lambdaConcurrency } from "./lambda-concurrency";
import { secretRotation } from "./secret-rotation";
import { dbExhaustionEs } from "./es/db-exhaustion";
import { queueBacklogEs } from "./es/queue-backlog";
import { oidcTrustEs } from "./es/oidc-trust";
import { dnsWeightedLegacyEs } from "./es/dns-weighted-legacy";
import { lambdaConcurrencyEs } from "./es/lambda-concurrency";
import { secretRotationEs } from "./es/secret-rotation";

// To add an incident: create its English file, its Spanish overlay in ./es,
// and append both here. Ordered roughly by difficulty; "Next incident" follows this order.
const SOURCES: { en: Incident; es: IncidentTranslation }[] = [
  { en: dbExhaustion, es: dbExhaustionEs },
  { en: queueBacklog, es: queueBacklogEs },
  { en: oidcTrust, es: oidcTrustEs },
  { en: dnsWeightedLegacy, es: dnsWeightedLegacyEs },
  { en: lambdaConcurrency, es: lambdaConcurrencyEs },
  { en: secretRotation, es: secretRotationEs },
];

/** English source scenarios, used for ids and for checks. */
export const incidents: Incident[] = SOURCES.map((s) => s.en);

const localized: Record<Lang, Incident[]> = {
  en: incidents,
  es: SOURCES.map((s) => overlay(s.en, s.es)),
};

export function getIncidents(lang: Lang): Incident[] {
  return localized[lang];
}

export function getIncident(id: string, lang: Lang = "en"): Incident | undefined {
  return localized[lang].find((i) => i.id === id);
}

export function nextIncident(id: string, lang: Lang = "en"): Incident {
  const list = localized[lang];
  const index = list.findIndex((i) => i.id === id);
  return list[(index + 1) % list.length];
}

/** Translation overlays, exposed for consistency checks. */
export const translations = SOURCES.map((s) => ({ id: s.en.id, es: s.es }));
