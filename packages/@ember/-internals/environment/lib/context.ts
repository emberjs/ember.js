export interface GlobalContext {
  imports: object;
  exports: object;
  lookup: Record<string, unknown>;
}

const global = globalThis as Record<string, unknown>;
const Ember = global['Ember'] as Partial<GlobalContext> | undefined;

// legacy imports/exports/lookup stuff (should we keep this??)
export const context: GlobalContext =
  Ember === undefined
    ? { imports: global, exports: global, lookup: global }
    : {
        // import jQuery
        imports: Ember.imports || global,
        // export Ember
        exports: Ember.exports || global,
        // search for Namespaces
        lookup: Ember.lookup || global,
      };

export function getLookup(): Record<string, unknown> {
  return context.lookup;
}

export function setLookup(value: Record<string, unknown>): void {
  context.lookup = value;
}
