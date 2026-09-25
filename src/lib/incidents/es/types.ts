import type { DeepPartial } from "../../localize";
import type { Incident } from "../../types";

/** Spanish overlay for an incident. Arrays follow the English order; include ids to keep them aligned. */
export type IncidentTranslation = DeepPartial<Incident>;
