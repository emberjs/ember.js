import { getDebugName, isObject } from '@ember/-internals/utils';
import { debugFreeze } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { CapturedArguments, Environment } from '@glimmer/interfaces';
import { HelperRootReference, RootReference, VersionedPathReference } from '@glimmer/reference';
import { PrimitiveReference } from '@glimmer/runtime';
import { consume, deprecateMutationsInAutotrackingTransaction } from '@glimmer/validator';
import { HelperInstance, isSimpleHelper, RECOMPUTE_TAG, SimpleHelper } from '../helper';

export class EmberHelperRootReference<T = unknown> extends HelperRootReference<T> {
  constructor(
    helper: SimpleHelper<T> | HelperInstance<T>,
    args: CapturedArguments,
    env: Environment
  ) {
    let fnWrapper = (args: CapturedArguments) => {
      let { positional, named } = args;

      let positionalValue = positional.value();
      let namedValue = named.value();

      let ret: T;

      if (DEBUG) {
        debugFreeze(positionalValue);
        debugFreeze(namedValue);

        deprecateMutationsInAutotrackingTransaction!(() => {
          ret = helper.compute(positionalValue, namedValue);
        });
      } else {
        ret = helper.compute(positionalValue, namedValue);
      }

      if (helper[RECOMPUTE_TAG]) {
        consume(helper[RECOMPUTE_TAG]);
      }

      return ret!;
    };

    if (DEBUG) {
      debugger
      let debugName = isSimpleHelper(helper)
        ? getDebugName!(helper.compute)
        : getDebugName!(helper);

      super(fnWrapper, args, env, debugName);
    } else {
      super(fnWrapper, args, env);
    }
  }
}

export class UnboundRootReference<T = unknown> extends RootReference<T> {
  constructor(
    private inner: T,
    protected env: Environment,
    parent?: VersionedPathReference,
    key?: string
  ) {
    super(env);

    if (DEBUG) {
      env.setTemplatePathDebugContext(this, key || 'this', parent || null);
    }
  }

  value() {
    return this.inner;
  }

  get(key: string): VersionedPathReference<unknown> {
    let value = this.value();

    if (isObject(value)) {
      // root of interop with ember objects
      return new UnboundPropertyReference(value[key], this.env, this, key);
    } else {
      return PrimitiveReference.create(value as any);
    }
  }
}

export class UnboundPropertyReference extends UnboundRootReference {}

export function referenceFromParts(
  root: VersionedPathReference<unknown>,
  parts: string[]
): VersionedPathReference<unknown> {
  let reference = root;

  for (let i = 0; i < parts.length; i++) {
    reference = reference.get(parts[i]);
  }

  return reference;
}
