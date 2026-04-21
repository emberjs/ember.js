/**
 * Augments @lifeart/gxt with exports that exist at runtime but are not
 * declared in the published npm package (v0.0.59 lacks context API types).
 *
 * This file is a MODULE (has a top-level export) so `declare module` below
 * performs augmentation rather than replacement.
 */

export {};

declare module '@lifeart/gxt' {
  // Context API — defined in context.d.ts but not re-exported from index.d.ts
  export function provideContext<T>(ctx: object, key: symbol, value: T): void;
  export function getContext<T>(ctx: object, key: symbol): T | undefined | null;

  // Symbol exports — defined in shared.d.ts but not re-exported
  export const RENDERED_NODES_PROPERTY: symbol;
  export const COMPONENT_ID_PROPERTY: symbol;

  // DOM API helper
  export function initDOM(ctx: object): unknown;
}
