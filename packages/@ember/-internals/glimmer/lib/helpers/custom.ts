import { getOwner } from '@ember/-internals/owner';
import { getDebugName } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Arguments, Helper as GlimmerHelper } from '@glimmer/interfaces';
import { createComputeRef, UNDEFINED_REFERENCE } from '@glimmer/reference';
import {
  associateDestroyableChild,
  EMPTY_ARGS,
  EMPTY_NAMED,
  EMPTY_POSITIONAL,
  isDestroyed,
  isDestroying,
} from '@glimmer/runtime';
import { Cache, createCache, getValue } from '@glimmer/validator';
import { argsProxyFor } from '../utils/args-proxy';
import { buildCapabilities, getHelperManager, InternalCapabilities } from '../utils/managers';

export type HelperDefinition = object;

export interface HelperCapabilities extends InternalCapabilities {
  hasValue: boolean;
  hasDestroyable: boolean;
  hasScheduledEffect: boolean;
}

export function helperCapabilities(
  managerAPI: string,
  options: Partial<HelperCapabilities> = {}
): HelperCapabilities {
  assert('Invalid helper manager compatibility specified', managerAPI === '3.23');

  assert(
    'You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted.',
    (options.hasValue || options.hasScheduledEffect) &&
      !(options.hasValue && options.hasScheduledEffect)
  );

  assert(
    'The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead',
    !options.hasScheduledEffect
  );

  return buildCapabilities({
    hasValue: Boolean(options.hasValue),
    hasDestroyable: Boolean(options.hasDestroyable),
    hasScheduledEffect: Boolean(options.hasScheduledEffect),
  });
}

export interface HelperManager<HelperStateBucket = unknown> {
  capabilities: HelperCapabilities;

  createHelper(definition: HelperDefinition, args: Arguments): HelperStateBucket;

  getDebugName?(definition: HelperDefinition): string;
}

export interface HelperManagerWithValue<HelperStateBucket = unknown>
  extends HelperManager<HelperStateBucket> {
  getValue(bucket: HelperStateBucket): unknown;
}

function hasValue(manager: HelperManager): manager is HelperManagerWithValue {
  return manager.capabilities.hasValue;
}

export interface HelperManagerWithDestroyable<HelperStateBucket = unknown>
  extends HelperManager<HelperStateBucket> {
  getDestroyable(bucket: HelperStateBucket): object;
}

function hasDestroyable(manager: HelperManager): manager is HelperManagerWithDestroyable {
  return manager.capabilities.hasDestroyable;
}

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

export function invokeHelper(
  context: object,
  definition: HelperDefinition,
  computeArgs: (context: object) => Partial<Arguments>
): Cache<unknown> {
  assert(
    `Expected a context object to be passed as the first parameter to invokeHelper, got ${context}`,
    context !== null && typeof context === 'object'
  );

  const owner = getOwner(context);
  const manager = getHelperManager(owner, definition)!;

  // TODO: figure out why assert isn't using the TS assert thing
  assert(
    `Expected a helper definition to be passed as the second parameter to invokeHelper, but no helper manager was found. The definition value that was passed was \`${getDebugName!(
      definition
    )}\`. Did you use setHelperManager to associate a helper manager with this value?`,
    manager
  );

  let args = new SimpleArgsProxy(context, computeArgs);
  let bucket = manager.createHelper(definition, args);

  let cache: Cache<unknown>;

  if (hasValue(manager)) {
    cache = createCache(() => {
      assert(
        `You attempted to get the value of a helper after the helper was destroyed, which is not allowed`,
        !isDestroying(cache) && !isDestroyed(cache)
      );

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

export default function customHelper(
  manager: HelperManager<unknown>,
  definition: HelperDefinition
): GlimmerHelper {
  return (vmArgs, vm) => {
    const args = argsProxyFor(vmArgs.capture(), 'helper');
    const bucket = manager.createHelper(definition, args);

    if (hasDestroyable(manager)) {
      vm.associateDestroyable(manager.getDestroyable(bucket));
    }

    if (hasValue(manager)) {
      return createComputeRef(
        () => manager.getValue(bucket),
        null,
        DEBUG && manager.getDebugName && manager.getDebugName(definition)
      );
    } else {
      return UNDEFINED_REFERENCE;
    }
  };
}
