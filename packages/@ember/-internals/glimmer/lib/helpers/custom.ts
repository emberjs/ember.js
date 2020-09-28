import { getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Arguments, Helper as GlimmerHelper } from '@glimmer/interfaces';
import { createComputeRef, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { associateDestroyableChild, isDestroyed, isDestroying } from '@glimmer/runtime';
import { Cache, createCache } from '@glimmer/validator';
import { argsProxyFor } from '../utils/args-proxy';
import { getHelperManager } from '../utils/managers';

export type HelperDefinition = object;

export interface HelperCapabilities {
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

  return {
    hasValue: Boolean(options.hasValue),
    hasDestroyable: Boolean(options.hasDestroyable),
    hasScheduledEffect: Boolean(options.hasScheduledEffect),
  };
}

export interface HelperManager<HelperStateBucket = unknown> {
  capabilities: HelperCapabilities;

  createHelper(definition: HelperDefinition, args: Arguments): HelperStateBucket;

  getDebugName?(definition: HelperDefinition): string;
}

export interface HelperManagerWithValue<HelperStateBucket = unknown>
  extends HelperManager<HelperStateBucket> {
  getValue(bucket: HelperStateBucket, args: Arguments): unknown;
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

// Tests:
//  manager does not have value
//  tracked args
//  internal helper state
//  injecting services
//   - with component
//  destruction
//   - context
//   - cache
//   - when component gets destroyed
//   - call getValue after cache is destroyed: error
//   - destroying the context also destroys the cache
export function invokeHelper(
  context: object,
  definition: HelperDefinition,
  computeArgs: (context: object) => Arguments
) {
  // TODO: make one test where there is no owner
  //       example:
  //       class {}
  const owner = getOwner(context);
  const manager = getHelperManager(owner, definition)!;

  // TODO: figure out why assert isn't using the TS assert thing
  assert(`Expected helper manager to exist`, manager);

  let helper: unknown;

  // Cache reference needed by associateDestroyableChild
  let cache: Cache<unknown> = createCache(() => {
    // assert(`Cache has already been destroyed`, isDestroying(cache) || isDestroyed(cache));

    let args = computeArgs(context);

    if (helper === undefined) {
      helper = manager.createHelper(definition, args);

      if (hasDestroyable(manager)) {
        let destroyable = manager.getDestroyable(helper);

        associateDestroyableChild(context, cache);
        associateDestroyableChild(cache, destroyable);
      }
    }

    if (hasValue(manager)) {
      return manager.getValue(helper, args);
    }

    return;
  });

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
        () => manager.getValue(bucket, args),
        null,
        DEBUG && manager.getDebugName && manager.getDebugName(definition)
      );
    } else {
      return UNDEFINED_REFERENCE;
    }
  };
}
