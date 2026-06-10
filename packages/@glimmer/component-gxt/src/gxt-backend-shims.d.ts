/**
 * Ambient type declarations for the `@ember/-internals/gxt-backend/*` shim
 * subpaths this package re-exports.
 *
 * The shim modules only resolve at build time through the GXT rollup alias
 * map (see `rollup.config.mjs`); they are intentionally not resolvable from
 * the classic type-check, which is why this package is excluded from the root
 * `tsconfig.json` (the same treatment the `gxt-backend` shims and the `demo`
 * workspace get). These declarations exist purely so the package can be
 * type-checked in isolation via its own `tsconfig.json`. They mirror the
 * runtime surface the shims expose; the runtime identity (not the types) is
 * what the identity test verifies.
 *
 * Scoped to this (excluded) package — these declarations do not leak into the
 * root program.
 */
declare module '@ember/-internals/gxt-backend/validator' {
  export function createTag(): unknown;
  export const CURRENT_TAG: unknown;
}

declare module '@ember/-internals/gxt-backend/glimmer-tracking' {
  export function tracked(target: object, key: string, desc?: PropertyDescriptor): unknown;
  export function cached(
    target: object,
    key: string,
    desc: PropertyDescriptor
  ): PropertyDescriptor;
  export function createCache<T>(fn: () => T): { value: T };
  export function getValue<T>(cache: { value: T }): T;
}
