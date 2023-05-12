import { associateDestroyableChild } from '@glimmer/destroyable';
import type {
  Helper,
  HelperCapabilities,
  HelperCapabilitiesVersions,
  HelperDefinitionState,
  HelperManager,
  HelperManagerWithDestroyable,
  HelperManagerWithValue,
  InternalHelperManager,
  Owner,
} from "@glimmer/interfaces";
import { createComputeRef, createConstRef, UNDEFINED_REFERENCE } from '@glimmer/reference';

import { argsProxyFor } from '../util/args-proxy';
import { buildCapabilities, FROM_CAPABILITIES } from '../util/capabilities';
import type { ManagerFactory } from './index';

export function helperCapabilities<Version extends keyof HelperCapabilitiesVersions>(
  managerAPI: Version,
  options: Partial<HelperCapabilities> = {}
): HelperCapabilities {
  if (import.meta.env.DEV && managerAPI !== '3.23') {
    throw new Error('Invalid helper manager compatibility specified');
  }

  if (
    import.meta.env.DEV &&
    (!(options.hasValue || options.hasScheduledEffect) ||
      (options.hasValue && options.hasScheduledEffect))
  ) {
    throw new Error(
      'You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted.'
    );
  }

  if (import.meta.env.DEV && options.hasScheduledEffect) {
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
  constructor(private factory: ManagerFactory<O | undefined, HelperManager<unknown>>) {}

  private helperManagerDelegates = new WeakMap<O, HelperManager<unknown>>();
  private undefinedDelegate: HelperManager<unknown> | null = null;

  private getDelegateForOwner(owner: O) {
    let delegate = this.helperManagerDelegates.get(owner);

    if (delegate === undefined) {
      let { factory } = this;
      delegate = factory(owner);

      if (import.meta.env.DEV && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
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

  getHelper(definition: HelperDefinitionState): Helper {
    return (capturedArgs, owner) => {
      let manager = this.getDelegateFor(owner as O | undefined);

      const args = argsProxyFor(capturedArgs, 'helper');
      const bucket = manager.createHelper(definition, args);

      if (hasValue(manager)) {
        let cache = createComputeRef(
          () => (manager as HelperManagerWithValue<unknown>).getValue(bucket),
          null,
          import.meta.env.DEV && manager.getDebugName && manager.getDebugName(definition)
        );

        if (hasDestroyable(manager)) {
          associateDestroyableChild(cache, manager.getDestroyable(bucket));
        }

        return cache;
      } else if (hasDestroyable(manager)) {
        let ref = createConstRef(
          undefined,
          import.meta.env.DEV && (manager.getDebugName?.(definition) ?? 'unknown helper')
        );

        associateDestroyableChild(ref, manager.getDestroyable(bucket));

        return ref;
      } else {
        return UNDEFINED_REFERENCE;
      }
    };
  }
}
