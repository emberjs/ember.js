/**
 * gxt exports the compat bridge reads through one module: `argSource`,
 * `argumentOf` and `isItemSlotParam` (gxt 0.0.88, the release Ember pins).
 * Named imports: the bundler keeps these three functions and nothing else of
 * gxt's main entry for them.
 */
import { argSource, argumentOf, isItemSlotParam } from '@lifeart/gxt';

/**
 * Where a write of a component argument gxt's compiler emitted goes (gxt
 * `argSource`): `[parent, key]`, `null` (not writable) or `undefined` (gxt said
 * nothing).
 */
export const gxtArgSource: (fn: unknown) => readonly [() => unknown, string] | null | undefined =
  argSource as unknown as (fn: unknown) => readonly [() => unknown, string] | null | undefined;

/**
 * The argument `key` of an args object gxt's `$_args` built (its angle-bracket
 * invocations), as the compiler passed it: its getter, which carries its
 * source (gxt `argumentOf`); `undefined` for any other object.
 */
export const gxtArgumentOf: (args: object, key: string) => unknown = argumentOf;

/**
 * Whether a yielded param follows a list row's item (gxt `isItemSlotParam`).
 */
export const gxtIsItemSlotParam: (param: unknown) => boolean = isItemSlotParam;
