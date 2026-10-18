// gxt NATIVE layer — loose-mode (resolver-mode) name resolution. The native
// twin of classic `glimmer/lib/resolver.ts` (`lookupComponent` /
// `lookupHelper` / `lookupModifier`) plus Glimmer's resolution-time assertions
// (opcode-compiler `resolution.ts`).
//
// Where names come from: a LOOSE template (a build-time `precompileTemplate(…)`
// with `strictMode: false`, or a runtime-compiled loose template) is
// compiled under NATIVE_FLAGS.EMBER_LOOSE_COMPONENTS, so a free name reaches the
// host as a STRING:
//   - `<FooBar>` / `<Foo::Bar>` / `{{#foo-bar}}` / `{{component "foo-bar"}}` →
//     `$_c("foo-bar", …)` → the component manager (managers.ts);
//   - `(foo-bar)` / `attr={{foo-bar}}` → `$_maybeHelper("foo-bar", …)` → the
//     helper manager (helper-manager.ts);
//   - `<div {{foo-bar}}>` → `$_maybeModifier("foo-bar", …)` → the modifier
//     manager (modifier-manager.ts);
//   - a content-position `{{foo-bar …}}` → `$_looseAppend("foo-bar", …)` → the
//     `resolveComponentOrHelper` host hook below (component first, then helper;
//     an argument-less miss renders nothing — Glimmer's
//     ResolveOptionalComponentOrHelper).
// The owner is the render tree's (gxt context `OWNER`). Unresolvable names
// raise Glimmer's / Ember's errors — never a silent element or empty render.
import type { InternalFactory, InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { getInternalHelperManager, setInternalHelperManager } from './manager-api';
import { ownerOfContext } from './managers';
import { array, concat, fn, get, hash, KEYWORD_HELPERS, on } from './runtime-helpers';

// ---------------------------------------------------------------- components
/**
 * The component definition registered as `component:<name>` (classic
 * `lookupComponentPair` — Ember 4+ has no `template:components/*` fallback):
 * the registered class / `templateOnly()` definition / template function, or
 * `null`.
 */
export function lookupComponent(owner: InternalOwner, name: string): object | null {
  const factory = owner.factoryFor(`component:${name}`) as InternalFactory<object> | undefined;
  if (factory === undefined || factory === null) {
    assert(
      'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
      name !== 'text-area'
    );
    return null;
  }
  const definition = factory.class as object | undefined;
  assert(`missing component class ${name}`, definition !== undefined);
  return definition ?? null;
}

// Glimmer's resolution misses (DEBUG: Glimmer's messages; production: short).
function notFound(name: string, kind: string): Error {
  return new Error(
    DEBUG
      ? `Attempted to resolve \`${name}\`, which was expected to be a ${kind}, but nothing was found.`
      : `unresolved ${kind} \`${name}\``
  );
}

/** Glimmer's resolveComponent miss. */
export function componentNotFound(name: string): Error {
  return notFound(name, 'component');
}

// ---------------------------------------------------------------- helpers
// Ember's loose-mode built-in helpers (classic BUILTIN_HELPERS). `unique-id`
// compiles to gxt `$_uid`; `{{mut}}` / `{{readonly}}` / `{{unbound}}` are
// documented legacy drops.
const BUILTIN_HELPERS: Readonly<Record<string, object>> = { array, concat, fn, get, hash };

const CLASSIC_HELPER_MANAGER_ASSOCIATED = new WeakSet<object>();

/**
 * Classic `lookupHelper`: a built-in, else the `helper:<name>` registration — a
 * classic `Helper` class resolves to its FACTORY (injections bound) carrying
 * the classic helper manager, anything else to the registered value. Strict
 * mode's auto-imported keyword helpers (`neq`, `gt`, …) arrive here as names
 * too and are the last fallback. `null` when nothing matches.
 */
export function lookupHelper(owner: InternalOwner | undefined, name: string): object | null {
  const builtin = BUILTIN_HELPERS[name];
  if (owner !== undefined && builtin !== undefined) assertNotOverwritten(owner, name);
  if (builtin !== undefined) return builtin;
  if (owner !== undefined) {
    const factory = owner.factoryFor(`helper:${name}`) as InternalFactory<object> | undefined;
    if (factory !== undefined && factory !== null) {
      const definition = factory.class as object | undefined;
      if (definition === undefined) return null;
      // A classic `Helper` class (`static isHelperFactory = true`; a `helper()`
      // wrapper is an object): the factory, carrying the class's (classic)
      // helper manager — read through the manager registry, so the classic
      // Helper module is not pulled into apps that never use it.
      if (
        typeof definition === 'function' &&
        (definition as { isHelperFactory?: unknown }).isHelperFactory === true
      ) {
        if (!CLASSIC_HELPER_MANAGER_ASSOCIATED.has(factory)) {
          CLASSIC_HELPER_MANAGER_ASSOCIATED.add(factory);
          setInternalHelperManager(getInternalHelperManager(definition), factory);
        }
        return factory;
      }
      return definition;
    }
  }
  return KEYWORD_HELPERS[name] ?? null;
}

// Classic `lookupHelper`'s check for a built-in helper name.
function assertNotOverwritten(owner: InternalOwner, name: string): void {
  assert(
    `You attempted to overwrite the built-in helper "${name}" which is not allowed. Please rename the helper.`,
    !owner.hasRegistration(`helper:${name}`)
  );
}

/**
 * gxt `looseBuiltins` host hook (DEBUG): a loose template that lowered the free
 * names `array` / `fn` / `hash` / `unique-id` to gxt built-ins reports them on
 * every render — Glimmer resolves them through `lookupHelper`, so the same
 * overwritten-built-in assertion applies.
 */
export function assertLooseBuiltins(ctx: object, names: readonly string[]): void {
  const owner = ownerOfContext(ctx) as InternalOwner | undefined;
  if (owner === undefined) return;
  for (const name of names) assertNotOverwritten(owner, name);
}

/** Glimmer's resolveHelper miss. */
export function helperNotFound(name: string): Error {
  return notFound(name, 'helper');
}

// ---------------------------------------------------------------- modifiers
const BUILTIN_MODIFIERS: Readonly<Record<string, object>> = { on };

/** Classic `lookupModifier`: `on`, else the `modifier:<name>` registration. */
export function lookupModifier(owner: InternalOwner | undefined, name: string): object | null {
  const builtin = BUILTIN_MODIFIERS[name];
  if (builtin !== undefined) return builtin;
  if (owner === undefined) return null;
  const factory = owner.factoryFor(`modifier:${name}`) as InternalFactory<object> | undefined;
  if (factory === undefined || factory === null) return null;
  return (factory.class as object | undefined) ?? null;
}

/** Glimmer's resolveModifier miss. */
export function modifierNotFound(name: string): Error {
  return notFound(name, 'modifier');
}

// ---------------------------------------------------------------- ambiguous append
/**
 * gxt `resolveComponentOrHelper` host hook (`$_looseAppend`): Glimmer's
 * ResolveComponentOrHelper (`{{name arg}}`: component, else helper, else an
 * error) and ResolveOptionalComponentOrHelper (`{{name}}`: component, else
 * helper, else nothing).
 */
export function resolveComponentOrHelper(
  name: string,
  ctx: object,
  optional: boolean
): 'component' | 'helper' | null {
  const owner = ownerOfContext(ctx) as InternalOwner | undefined;
  if (owner === undefined) {
    throw new Error(
      DEBUG
        ? `Attempted to resolve \`${name}\`, but no owner was associated with the template it was being resolved from.`
        : `no owner to resolve \`${name}\``
    );
  }
  if (lookupComponent(owner, name) !== null) return 'component';
  if (lookupHelper(owner, name) !== null) return 'helper';
  if (optional) return null;
  throw notFound(name, 'component or helper');
}
