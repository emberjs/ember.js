/**
 * Ambient type declarations for the `@ember/-internals/*` modules this package
 * re-exports (the validator shim and metal's `tracked` / `cached`).
 *
 * The package is excluded from the root `tsconfig.json` (the same treatment
 * the `gxt-backend` shims get), and these modules do not resolve from its own
 * `tsconfig.json`; the GXT rollup build resolves them (see
 * `rollup.config.mjs`). These declarations exist purely so the package can be
 * type-checked in isolation via its own `tsconfig.json`. They mirror the
 * runtime surface those modules expose; the runtime identity (not the types)
 * is what the identity test verifies.
 *
 * The file is a `.ts` script, not a `.d.ts`: `types/publish.mjs` copies every
 * hand-written `.d.ts` under `packages/` into the published types, where a
 * second declaration of the real `@ember/-internals/metal/lib/*` modules would
 * clash with theirs.
 */
declare module '@ember/-internals/gxt-backend/validator' {
  export function createTag(): unknown;
  export const CURRENT_TAG: unknown;
  export function createCache<T>(fn: () => T): { value: T };
  export function getValue<T>(cache: { value: T }): T;
}

declare module '@ember/-internals/metal/lib/tracked' {
  export function tracked(target: object, key: string, desc?: PropertyDescriptor): unknown;
}

declare module '@ember/-internals/metal/lib/cached' {
  export const cached: (target: object, key: string, desc: PropertyDescriptor) => void;
}
