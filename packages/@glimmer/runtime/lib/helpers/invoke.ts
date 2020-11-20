import { DEBUG } from '@glimmer/env';
import { Cache, createCache, getValue } from '@glimmer/validator';
import { Arguments, HelperManager } from '@glimmer/interfaces';
import { debugToString } from '@glimmer/util';
import { getInternalHelperManager, hasDestroyable, hasValue } from '@glimmer/manager';

import { EMPTY_ARGS, EMPTY_NAMED, EMPTY_POSITIONAL } from '../vm/arguments';
import { getOwner } from '@glimmer/owner';
import { associateDestroyableChild, isDestroyed, isDestroying } from '@glimmer/destroyable';

let ARGS_CACHES = DEBUG ? new WeakMap<SimpleArgsProxy, Cache<Partial<Arguments>>>() : undefined;

function getArgs(proxy: SimpleArgsProxy): Partial<Arguments> {
  return getValue(DEBUG ? ARGS_CACHES!.get(proxy)! : proxy.argsCache!)!;
}

class SimpleArgsProxy {
  argsCache?: Cache<Partial<Arguments>>;

  constructor(
    context: object,
    computeArgs: (context: object) => Partial<Arguments> = () => EMPTY_ARGS
  ) {
    let argsCache = createCache(() => computeArgs(context));

    if (DEBUG) {
      ARGS_CACHES!.set(this, argsCache);
      Object.freeze(this);
    } else {
      this.argsCache = argsCache;
    }
  }

  get named() {
    return getArgs(this).named || EMPTY_NAMED;
  }

  get positional() {
    return getArgs(this).positional || EMPTY_POSITIONAL;
  }
}

////////////

export function invokeHelper(
  context: object,
  definition: object,
  computeArgs?: (context: object) => Partial<Arguments>
): Cache<unknown> {
  if (DEBUG && (typeof context !== 'object' || context === null)) {
    throw new Error(
      `Expected a context object to be passed as the first parameter to invokeHelper, got ${context}`
    );
  }

  const owner = getOwner(context);
  const internalManager = getInternalHelperManager(owner, definition)!;

  // TODO: figure out why assert isn't using the TS assert thing
  if (DEBUG && !internalManager) {
    throw new Error(
      `Expected a helper definition to be passed as the second parameter to invokeHelper, but no helper manager was found. The definition value that was passed was \`${debugToString!(
        definition
      )}\`. Did you use setHelperManager to associate a helper manager with this value?`
    );
  }

  if (DEBUG && typeof internalManager === 'function') {
    throw new Error(
      'Found a helper manager, but it was an internal built-in helper manager. `invokeHelper` does not support internal helpers yet.'
    );
  }

  const manager = internalManager as HelperManager<unknown>;
  let args = new SimpleArgsProxy(context, computeArgs);
  let bucket = manager.createHelper(definition, args);

  let cache: Cache<unknown>;

  if (hasValue(manager)) {
    cache = createCache(() => {
      if (DEBUG && (isDestroying(cache) || isDestroyed(cache))) {
        throw new Error(
          `You attempted to get the value of a helper after the helper was destroyed, which is not allowed`
        );
      }

      return manager.getValue(bucket);
    });

    associateDestroyableChild(context, cache);
  } else {
    throw new Error('TODO: unreachable, to be implemented with hasScheduledEffect');
  }

  if (hasDestroyable(manager)) {
    let destroyable = manager.getDestroyable(bucket);

    associateDestroyableChild(cache, destroyable);
  }

  return cache;
}
