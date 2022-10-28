import global from './global';

export interface GlobalContext {
  imports: object;
  exports: object;
  lookup: Record<string, unknown>;
}

// legacy imports/exports/lookup stuff (should we keep this??)
export const context = (function (
  global: Record<string, unknown>,
  Ember: Partial<GlobalContext> | undefined
): GlobalContext {
  return Ember === undefined
    ? { imports: global, exports: global, lookup: global }
    : {
        // import jQuery
        imports: Ember.imports || global,
        // export Ember
        exports: Ember.exports || global,
        // search for Namespaces
        lookup: Ember.lookup || global,
      };
})(global, global.Ember);

export function getLookup(): Record<string, unknown> {
  return context.lookup;
}

export function setLookup(value: Record<string, unknown>): void {
  context.lookup = value;
}
