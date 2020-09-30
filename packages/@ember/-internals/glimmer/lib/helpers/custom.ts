import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Arguments, Helper as GlimmerHelper } from '@glimmer/interfaces';
import { createComputeRef, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { argsProxyFor } from '../utils/args-proxy';
import { buildCapabilities, InternalCapabilities } from '../utils/managers';

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

export default function customHelper(
  manager: HelperManager<unknown>,
  definition: HelperDefinition
): GlimmerHelper {
  return (args, vm) => {
    const bucket = manager.createHelper(definition, argsProxyFor(args.capture(), 'helper'));

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
