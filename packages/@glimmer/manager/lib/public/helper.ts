import { DEBUG } from '@glimmer/env';
import {
  Helper as GlimmerHelper,
  HelperCapabilities,
  HelperCapabilitiesVersions,
  HelperManager,
  HelperManagerWithDestroyable,
  HelperManagerWithValue,
} from '@glimmer/interfaces';
import { createComputeRef, UNDEFINED_REFERENCE } from '@glimmer/reference';

import { buildCapabilities } from '../util/capabilities';
import { argsProxyFor } from '../util/args-proxy';

export function helperCapabilities<Version extends keyof HelperCapabilitiesVersions>(
  managerAPI: Version,
  options: Partial<HelperCapabilities> = {}
): HelperCapabilities {
  if (DEBUG && managerAPI !== '3.23') {
    throw new Error('Invalid helper manager compatibility specified');
  }

  if (
    DEBUG &&
    (!(options.hasValue || options.hasScheduledEffect) ||
      (options.hasValue && options.hasScheduledEffect))
  ) {
    throw new Error(
      'You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted.'
    );
  }

  if (DEBUG && options.hasScheduledEffect) {
    throw new Error(
      'The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead'
    );
  }

  return buildCapabilities({
    hasValue: Boolean(options.hasValue),
    hasDestroyable: Boolean(options.hasDestroyable),
    hasScheduledEffect: Boolean(options.hasScheduledEffect),
  });
}

////////////

export function hasValue(
  manager: HelperManager<unknown>
): manager is HelperManagerWithValue<unknown> {
  return manager.capabilities.hasValue;
}

export function hasDestroyable(
  manager: HelperManager<unknown>
): manager is HelperManagerWithDestroyable<unknown> {
  return manager.capabilities.hasDestroyable;
}

////////////

export function customHelper(manager: HelperManager<unknown>, definition: object): GlimmerHelper {
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
