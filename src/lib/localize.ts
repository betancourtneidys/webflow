/**
 * Translations are written as partial overlays of the English scenario:
 * objects merge by key, arrays of objects merge by position, and arrays of
 * strings are replaced whole. Anything not translated (numbers, series,
 * resource names, logs) falls through from the English source.
 */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export function overlay<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (over === undefined) return base;
  if (Array.isArray(base)) {
    const items = over as unknown[];
    if (base.every((b) => typeof b !== "object" || b === null)) return items as T;
    return base.map((b, i) => overlay(b, items[i] as DeepPartial<typeof b>)) as T;
  }
  if (base !== null && typeof base === "object") {
    const out = { ...base } as Record<string, unknown>;
    for (const [key, value] of Object.entries(over as object)) {
      out[key] = overlay((base as Record<string, unknown>)[key], value as never);
    }
    return out as T;
  }
  return over as T;
}
