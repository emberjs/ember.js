// gxt NATIVE layer — the `$_MANAGERS.helper` slot.
//
// Under NATIVE_FLAGS.EMBER_NATIVE every helper invocation compiles to
//   $_maybeHelper(definition, [args], {named}, ctx, site)
// (literal-or-thunk arguments, the enclosing render context, a per-template
// call-site index) and gxt hands every value this manager claims to `handle`.
//
// One helper INSTANCE per call site instance — keyed on (ctx, site), destroyed
// when gxt destroys `ctx` (the template / block instance holding the call
// site). That is the lifetime of a Glimmer helper reference (created once per
// call site per block, associated with the block). Its value is a native
// `createCache` over the manager's `getValue`: an evaluation of the call site
// whose consumed tags are unchanged returns the cached value without
// re-running the helper (gxt reads each binding twice on create — the helper
// still computes once) and re-consumes those tags into the reading binding
// formula, so it stays subscribed.
//
// Definitions:
//   - a curried helper (`(helper X 1)`): resolved with Glimmer's rules —
//     curried positional first, later named arguments win;
//   - a public custom manager (`setHelperManager`, capabilities 3.23; the
//     classic `Helper` class and `helper()` wrapper use it): delegate per owner,
//     `createHelper(definition, args)`, `getValue`, `getDestroyable` destroyed
//     with the call site;
//   - a plain function: the default (function) helper manager (manager-api
//     DEFAULT_HELPER_MANAGER) — positional arguments + the named hash as a
//     trailing argument when non-empty. Driven directly (functionHelperCache):
//     the call site's arguments are read straight into the call, with no
//     manager delegate, no positional args proxy and no owner lookup;
//   - an INTERNAL helper (`(capturedArgs, owner) => Reference`: `hash`,
//     `array`, `concat`, `get`, `fn`, `and`, `or`, classic `unique-id` /
//     `element`): one native reference per argument, the helper called once
//     per call site — or, when the helper has a direct form (`fn`,
//     runtime-helpers.ts `valueForCallSite`), that form's value, with no
//     references at all;
//   - a string: a loose-mode helper NAME (`(foo-bar)`, `attr={{foo-bar}}`, a
//     `{{foo-bar}}` the host resolved to a helper) or an unbound Ember
//     keyword helper gxt does not compile natively (`neq`, `gt`, …; Ember
//     auto-imports them in strict mode): resolved with classic `lookupHelper`
//     (native/resolver.ts) when the call site's instance is created; a miss is
//     Glimmer's "nothing was found" error.
import { DEBUG } from '@glimmer/env';
import {
  getCurried,
  registerDestructor as gxtRegisterDestructor,
  resolveCurried,
} from '@lifeart/gxt';
import { argsProxyFor, shiftLabels, unwrapArg, type ArgLabels, type ArgsSource } from './args';
import { _hasDestroyableChildren, destroy, isDestroying } from './destroyable';
import {
  DEFAULT_HELPER_MANAGER,
  getInternalHelperManager,
  CustomHelperManager,
  type HelperDelegate,
} from './manager-api';
import { ownerOfContext } from './managers';
import { createComputeRef, valueForRef, type Reference } from './reference';
import { helperNotFound, lookupHelper } from './resolver';
import { type InternalHelper } from './runtime-helpers';
import { createCache, getValue, type Cache } from './validator';

interface HelperInstance {
  readonly definition: unknown;
  /** The call site's current arguments (updated per evaluation). */
  readonly source: ArgsSource;
  /**
   * What the call site evaluates. `null` for an internal helper's direct form,
   * whose value (`value`) is computed once and never changes.
   */
  readonly cache: Cache | null;
  readonly value?: unknown;
  /** What destroying the call site destroys (Ember destroyable), if any. */
  readonly destroyable: object | null;
}

const NO_NAMED: Readonly<Record<string, unknown>> = Object.freeze({});

const valueOf = (instance: HelperInstance): unknown =>
  instance.cache === null ? instance.value : getValue(instance.cache);

const hasOwn = Object.prototype.hasOwnProperty;

function hasNamedArgs(named: Readonly<Record<string, unknown>>): boolean {
  for (const key in named) if (hasOwn.call(named, key)) return true;
  return false;
}

/**
 * A plain function helper (Glimmer's FunctionHelperManager, manager-api
 * DEFAULT_HELPER_MANAGER), driven directly: `helper(...positional)`, plus the
 * named arguments object as a trailing argument when the call site passes any
 * named argument (Glimmer: `Object.keys(args.named).length > 0`). Each argument
 * is read inside the cache, so the cache consumes exactly what the call reads.
 * The trailing object is the same named args proxy the manager path passes,
 * created once per call site; no positional proxy, no delegate, and no owner
 * (the default manager does not use it).
 */
function functionHelperCache(helper: (...args: unknown[]) => unknown, source: ArgsSource): Cache {
  let named: Record<string, unknown> | null = null;
  return createCache(
    () => {
      const positional = source.positional;
      const args: unknown[] = [];
      for (let i = 0; i < positional.length; i++) args.push(unwrapArg(positional[i]));
      if (hasNamedArgs(source.named)) {
        named ??= argsProxyFor(source, 'helper').named;
        args.push(named);
      }
      return helper(...args);
    },
    DEBUG && (helper.name ? `(helper function ${helper.name})` : '(anonymous helper function)')
  );
}

function describe(value: unknown): string {
  if (typeof value === 'function')
    return (value as { name?: string }).name || '(anonymous function)';
  return String(value);
}

/**
 * The helper instance for one call site. `source` holds the call site's
 * current arguments; it is updated on every evaluation of the call site.
 * `key` is what the call site evaluates (a definition or a helper NAME) — a
 * name resolves here, once per instance (Glimmer resolves a free name once
 * per template + owner). The owner is looked up (a render-tree walk from
 * `ctx`) only for the shapes that use it.
 */
// The reference of one argument of a call site: its label is the argument's
// source path (gxt EMBER_ARG_LABELS, DEBUG builds), when it is a path.
function argumentRef(read: () => unknown, label: string | null | undefined): Reference {
  const ref = createComputeRef(read);
  if (DEBUG && typeof label === 'string') ref.debugLabel = label;
  return ref;
}

function createInstance(key: object | string, ctx: unknown, source: ArgsSource): HelperInstance {
  let owner: object | undefined;
  let definition: object;
  if (typeof key === 'string') {
    owner = ownerOfContext(ctx);
    definition = resolveHelperName(key, owner);
  } else {
    definition = key;
  }
  const manager = getInternalHelperManager(definition) as
    | CustomHelperManager
    | InternalHelper
    | undefined;

  if (manager === DEFAULT_HELPER_MANAGER) {
    const cache = functionHelperCache(definition as (...args: unknown[]) => unknown, source);
    return { definition: key, source, cache, destroyable: null };
  }
  if (typeof manager === 'function' && manager.valueForCallSite !== undefined) {
    const value = manager.valueForCallSite(source);
    return { definition: key, source, cache: null, value, destroyable: null };
  }
  if (typeof key !== 'string') owner = ownerOfContext(ctx);

  if (typeof manager === 'function') {
    // Internal helper (Glimmer protocol): one reference per argument over the
    // call site's source (a call site's arity and named keys never change),
    // the helper invoked ONCE per call site.
    // DEBUG: a path argument's reference is labelled with its path, as
    // Glimmer's is (its `fn` assertion names the callback by it).
    const { labels } = source;
    const positional = source.positional.map((_, i) =>
      argumentRef(() => unwrapArg(source.positional[i]), labels?.positional?.[i])
    );
    const named: Record<string, Reference> = {};
    for (const key of Object.keys(source.named)) {
      named[key] = argumentRef(() => unwrapArg(source.named[key]), labels?.named?.[key]);
    }
    const ref = manager({ positional, named }, owner);
    return {
      definition: key,
      source,
      cache: createCache(() => valueForRef(ref)),
      destroyable: _hasDestroyableChildren(ref) ? ref : null,
    };
  }

  if (manager instanceof CustomHelperManager) {
    const delegate = manager.getDelegateFor(owner) as HelperDelegate;
    const args = argsProxyFor(source, 'helper');
    const bucket = delegate.createHelper(definition, args);
    const cache = delegate.capabilities.hasValue
      ? createCache(() => delegate.getValue!(bucket), DEBUG && delegate.getDebugName?.(definition))
      : createCache(() => undefined);
    const destroyable = delegate.capabilities.hasDestroyable
      ? (delegate.getDestroyable!(bucket) ?? null)
      : null;
    return { definition: key, source, cache, destroyable };
  }

  throw new Error(
    DEBUG
      ? `Attempted to use a value as a helper, but it was not an object or function. Helper definitions must be objects or functions with an associated helper manager. The value was: ${describe(definition)}`
      : 'BUG: helper manager expected'
  );
}

function resolveHelperName(name: string, owner: object | undefined): object {
  const definition = lookupHelper(owner as Parameters<typeof lookupHelper>[0], name);
  if (definition === null) throw helperNotFound(name);
  return definition;
}

// ---------------------------------------------------------------- call sites
const SITES = new WeakMap<object, Map<number, HelperInstance>>();

function destroyInstance(instance: HelperInstance): void {
  const { destroyable } = instance;
  if (destroyable !== null && !isDestroying(destroyable)) destroy(destroyable);
}

function instanceFor(
  ctx: object,
  site: number,
  definition: object | string,
  positional: readonly unknown[],
  named: Readonly<Record<string, unknown>>,
  labels: ArgLabels | undefined
): HelperInstance {
  let sites = SITES.get(ctx);
  if (sites === undefined) {
    sites = new Map();
    SITES.set(ctx, sites);
    const owned = sites;
    // The call sites live as long as the render context holding them.
    gxtRegisterDestructor(ctx as never, () => {
      SITES.delete(ctx);
      for (const instance of owned.values()) destroyInstance(instance);
      owned.clear();
    });
  }
  let instance = sites.get(site);
  if (instance !== undefined && instance.definition === definition) {
    instance.source.positional = positional;
    instance.source.named = named;
    return instance;
  }
  // First evaluation — or a dynamic helper (`{{(this.helper) …}}`) whose
  // definition changed: a new instance; the outgoing one is destroyed.
  if (instance !== undefined) destroyInstance(instance);
  instance = createInstance(definition, ctx, { positional, named, labels });
  sites.set(site, instance);
  return instance;
}

// ---------------------------------------------------------------- the slot
function canHandle(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const type = typeof value;
  if (type === 'function' || type === 'string') return true;
  return type === 'object' && getInternalHelperManager(value as object) !== undefined;
}

function handle(
  value: unknown,
  args: readonly unknown[],
  named: Readonly<Record<string, unknown>> | undefined,
  ctx?: unknown,
  site?: number,
  // gxt EMBER_ARG_LABELS (DEBUG builds): the source paths of the arguments.
  labels?: ArgLabels
): unknown {
  let definition: unknown = value;
  let positional = args;
  let namedArgs = named ?? NO_NAMED;

  if (getCurried(value) !== undefined) {
    const resolved = resolveCurried(value);
    definition = resolved.definition;
    if (resolved.positional.length > 0) positional = [...resolved.positional, ...args];
    if (resolved.named.length > 0) namedArgs = Object.assign({}, ...resolved.named, namedArgs);
    labels = shiftLabels(labels, resolved.positional.length);
  }

  if (definition === null || definition === undefined || definition === '') return undefined;

  if (ctx !== null && typeof ctx === 'object' && typeof site === 'number') {
    return valueOf(
      instanceFor(ctx, site, definition as object | string, positional, namedArgs, labels)
    );
  }
  // No call site to own it (not compiler-emitted): a one-shot invocation.
  const instance = createInstance(definition as object | string, ctx, {
    positional,
    named: namedArgs,
    labels,
  });
  try {
    return valueOf(instance);
  } finally {
    destroyInstance(instance);
  }
}

/** The `$_MANAGERS.helper` slot (registered by native/install.ts). */
export const helperManager = {
  canHandle,
  handle: handle as (helper: unknown, params: unknown[], hash: unknown) => unknown,
};
