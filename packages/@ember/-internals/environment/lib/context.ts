import global from './global';

export interface GlobalContext {
  imports: object;
  exports: object;
  lookup: object;
}

// legacy imports/exports/lookup stuff (should we keep this??)
export const context = (function(
  global: object,
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

export function getLookup(): object {
  return context.lookup;
}

export function setLookup(value: object): void {
  context.lookup = value;
}
