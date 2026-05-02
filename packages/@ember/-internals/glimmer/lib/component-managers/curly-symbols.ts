// Symbols and the cheap brand-based `isCurlyManager` predicate, kept in
// their own module so consumers (e.g. the resolver) can identify the
// curly component manager without statically pulling in the full
// `./curly` module — that file carries the entire classic component
// lifecycle plus its transitive deps (~17 KB raw plus the @ember/object
// graph). With this split, `renderComponent`-only bundles never load
// `./curly` at all.

export const DIRTY_TAG: unique symbol = Symbol('DIRTY_TAG');
export const IS_DISPATCHING_ATTRS: unique symbol = Symbol('IS_DISPATCHING_ATTRS');
export const BOUNDS: unique symbol = Symbol('BOUNDS');

export const CURLY_COMPONENT_BRAND: unique symbol = Symbol('CURLY_COMPONENT_BRAND');

export function isCurlyManager(manager: object): boolean {
  return (manager as { [CURLY_COMPONENT_BRAND]?: boolean })[CURLY_COMPONENT_BRAND] === true;
}
