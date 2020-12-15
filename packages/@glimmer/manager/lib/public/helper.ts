import { DEBUG } from '@glimmer/env';
import {
  Helper,
  HelperCapabilities,
  HelperCapabilitiesVersions,
  HelperManager,
  HelperManagerWithDestroyable,
  HelperManagerWithValue,
  InternalHelperManager,
  Owner,
} from '@glimmer/interfaces';
import { createComputeRef, UNDEFINED_REFERENCE } from '@glimmer/reference';

import { buildCapabilities, FROM_CAPABILITIES } from '../util/capabilities';
import { argsProxyFor } from '../util/args-proxy';
import { ManagerFactory } from './index';

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

export class CustomHelperManager<O extends Owner = Owner> implements InternalHelperManager<O> {
  constructor(
    private factory: ManagerFactory<O | undefined, HelperManager<unknown>>,
    private definition: object
  ) {}

  private helperManagerDelegates = new WeakMap<O, HelperManager<unknown>>();
  private undefinedDelegate: HelperManager<unknown> | null = null;

  private getDelegateForOwner(owner: O) {
    let delegate = this.helperManagerDelegates.get(owner);

    if (delegate === undefined) {
      let { factory } = this;
      delegate = factory(owner);

      if (DEBUG && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
        // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
        throw new Error(
          `Custom helper managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.23')\` (imported via \`import { capabilities } from '@ember/helper';\`). Received: \`${JSON.stringify(
            delegate.capabilities
          )}\` for: \`${delegate}\``
        );
      }

      this.helperManagerDelegates.set(owner, delegate);
    }

    return delegate;
  }

  getDelegateFor(owner: O | undefined) {
    if (owner === undefined) {
      let { undefinedDelegate } = this;

      if (undefinedDelegate === null) {
        let { factory } = this;
        this.undefinedDelegate = undefinedDelegate = factory(undefined);
      }

      return undefinedDelegate;
    } else {
      return this.getDelegateForOwner(owner);
    }
  }

  helper: Helper = (vmArgs, vm) => {
    let owner = vm.getOwner() as O;

    let manager = this.getDelegateForOwner(owner);

    const args = argsProxyFor(vmArgs.capture(), 'helper');
    const bucket = manager.createHelper(this.definition, args);

    if (hasDestroyable(manager)) {
      vm.associateDestroyable(manager.getDestroyable(bucket));
    }

    if (hasValue(manager)) {
      return createComputeRef(
        () => (manager as HelperManagerWithValue<unknown>).getValue(bucket),
        null,
        DEBUG && manager.getDebugName && manager.getDebugName(this.definition)
      );
    } else {
      return UNDEFINED_REFERENCE;
    }
  };
}
