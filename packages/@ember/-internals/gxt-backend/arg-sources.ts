/**
 * Where a write of a classic component's argument goes (two-way binding), as
 * gxt's compiler emitted it.
 *
 * gxt's compat compiler brands the getter of every component argument and
 * gives the getter of a path argument its source (gxt `argSource`): the object
 * the path's last segment is a property of, and that property — as Glimmer's
 * reference for the path writes. The host records, for each args object it
 * builds from an invocation's `@name` getters (compile.ts,
 * ember-gxt-wrappers.ts), the source of each argument, and the component
 * manager (manager.ts) writes a two-way bound argument there instead of
 * guessing the source from the reads the getter makes.
 */
import { isArgThunk as gxtIsArgThunk } from '@lifeart/gxt';
import { gxtArgSource, gxtArgumentOf } from './gxt-next-exports';

export interface GxtArgSource {
  /** Reads the object the write sets a property of (when the write happens). */
  readonly parent: () => unknown;
  /** The property, or `@name` for the caller's argument `name` (see below). */
  readonly key: string;
}

// The sources of the arguments of each args object: an argument the compiler
// emitted without a source (a literal, a helper's result, a block param
// itself) is `null`: not writable.
const argSources = new WeakMap<object, Map<string, GxtArgSource | null>>();

/**
 * Record the source of the argument `key` of `args`, whose value is `value` as
 * the invocation passed it. A value gxt's compiler gave no source (not one of
 * its component argument getters) tells nothing: its argument's source is left
 * to the manager's guess.
 */
export function recordArgSource(args: object, key: string, value: unknown): void {
  if (!gxtIsArgThunk(value)) return;
  const source = gxtArgSource(value);
  if (source === undefined) return;
  let sources = argSources.get(args);
  if (sources === undefined) {
    sources = new Map();
    argSources.set(args, sources);
  }
  sources.set(key, source === null ? null : { parent: source[0], key: source[1] });
}

// The args objects whose sources were looked for in gxt (`sourcesOf`).
const lookedUp = new WeakSet<object>();

/**
 * The sources of the arguments of `args`. An args object the host did not
 * build — gxt's angle-bracket invocation (`<Outer @value={{this.local}} />`)
 * builds it with `$_args`, which a component's template can read as its `@`
 * arguments, or the host copies its properties — has its arguments' sources
 * looked up once: the getters as gxt's compiler passed them, which gxt gives
 * (`argumentOf`) or the object holds as a property's value.
 */
function sourcesOf(args: object): Map<string, GxtArgSource | null> | undefined {
  const recorded = argSources.get(args);
  if (recorded !== undefined || lookedUp.has(args)) return recorded;
  lookedUp.add(args);
  for (const key of Object.keys(args)) {
    let compiled = gxtArgumentOf(args, key);
    if (compiled === undefined) {
      const descriptor = Object.getOwnPropertyDescriptor(args, key);
      if (descriptor !== undefined && 'value' in descriptor) compiled = descriptor.value;
    }
    recordArgSource(args, key, compiled);
  }
  return argSources.get(args);
}

/**
 * `target` reads the arguments of `args` (a component's render-context args
 * object): its arguments' sources are those of `args`.
 */
export function shareArgSources(target: object, args: object): void {
  if (target === args) return;
  const sources = sourcesOf(args);
  if (sources !== undefined) argSources.set(target, sources);
}

/**
 * `target` was built from the arguments of `args` (the host copies an
 * invocation's args object into its own, reading the arguments through
 * getters): an argument of `args` it has no source for writes where that of
 * `args` does.
 */
export function inheritArgSources(target: object, args: object): void {
  if (target === args) return;
  const sources = sourcesOf(args);
  if (sources === undefined) return;
  const own = argSources.get(target);
  if (own === undefined) {
    argSources.set(target, new Map(sources));
    return;
  }
  sources.forEach((source, key) => {
    if (!own.has(key)) own.set(key, source);
  });
}

/**
 * The source of the argument `key` of `args`: `undefined` when gxt's compiler
 * told nothing about it (the manager guesses), `null` when the argument is
 * not writable, else where a write of it goes.
 */
export function compiledArgSource(args: object, key: string): GxtArgSource | null | undefined {
  return sourcesOf(args)?.get(key);
}

/**
 * The object and property a write of an argument with `source` sets, or
 * `null` when there is none. A source keyed `@name` is the caller's argument
 * `name` of the args object its parent reads (`{{inner value=@x}}`): it is
 * followed to where that argument writes, as Glimmer's `@x` is the caller's
 * reference; an argument the caller passed as a literal or a helper's result
 * is not writable.
 */
export function resolveArgWrite(source: GxtArgSource): readonly [object, string] | null {
  let parent = source.parent();
  let key = source.key;
  for (let depth = 0; depth < 32; depth++) {
    if (parent === null || (typeof parent !== 'object' && typeof parent !== 'function')) {
      return null;
    }
    // A block param itself of a by-name component's block: compat reads it
    // as a member `$_bp<i>` of the block's params (ast-transforms.ts
    // `gxtBlockParamsTransform`). Glimmer updates only the block param's own
    // reference: nothing is written.
    if (/^\$_bp\d+$/.test(key)) return null;
    if (!key.startsWith('@')) return [parent, key];
    // The caller's argument: not writable, or nothing known about it (an
    // argument the compiler gave no source): nothing is written. The args
    // object a template reads its `@` arguments from may be one gxt built
    // (`sourcesOf`).
    const outer = sourcesOf(parent)?.get(key.slice(1));
    if (outer === undefined || outer === null) return null;
    parent = outer.parent();
    key = outer.key;
  }
  return null;
}
