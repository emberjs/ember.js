import { DEBUG } from '@glimmer/env';
import {
  Arguments,
  CapturedArguments,
  InternalModifierManager,
  ModifierCapabilities,
  ModifierCapabilitiesVersions,
  ModifierManager,
  Owner,
} from '@glimmer/interfaces';
import { registerDestructor } from '@glimmer/destroyable';
import { setOwner } from '@glimmer/owner';
import { valueForRef } from '@glimmer/reference';
import { assign, castToBrowser, dict } from '@glimmer/util';
import {
  createUpdatableTag,
  deprecateMutationsInTrackingTransaction,
  untrack,
  UpdatableTag,
} from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { buildCapabilities, FROM_CAPABILITIES } from '../util/capabilities';
import { argsProxyFor } from '../util/args-proxy';
import { ManagerFactory } from '.';

export function modifierCapabilities<Version extends keyof ModifierCapabilitiesVersions>(
  managerAPI: Version,
  optionalFeatures: ModifierCapabilitiesVersions[Version] = {}
): ModifierCapabilities {
  if (DEBUG && managerAPI !== '3.13' && managerAPI !== '3.22') {
    throw new Error('Invalid modifier manager compatibility specified');
  }

  return buildCapabilities({
    disableAutoTracking: Boolean(optionalFeatures.disableAutoTracking),
    useArgsProxy: managerAPI === '3.13' ? false : true,

    // This capability is used in Ember, exclusively in resolution mode. See the
    // Ember glimmer resolver for details.
    passFactoryToCreate: managerAPI === '3.13',
  });
}

export interface CustomModifierState<ModifierInstance> {
  tag: UpdatableTag;
  element: SimpleElement;
  modifier: ModifierInstance;
  delegate: ModifierManager<ModifierInstance>;
  args: Arguments;
  debugName?: string;
}

interface Factory {
  create(params: Record<string, unknown>): object;
}

/**
  The CustomModifierManager allows addons to provide custom modifier
  implementations that integrate seamlessly into Ember. This is accomplished
  through a delegate, registered with the custom modifier manager, which
  implements a set of hooks that determine modifier behavior.
  To create a custom modifier manager, instantiate a new CustomModifierManager
  class and pass the delegate as the first argument:

  ```js
  let manager = new CustomModifierManager({
    // ...delegate implementation...
  });
  ```

  ## Delegate Hooks

  Throughout the lifecycle of a modifier, the modifier manager will invoke
  delegate hooks that are responsible for surfacing those lifecycle changes to
  the end developer.
  * `createModifier()` - invoked when a new instance of a modifier should be created
  * `installModifier()` - invoked when the modifier is installed on the element
  * `updateModifier()` - invoked when the arguments passed to a modifier change
  * `destroyModifier()` - invoked when the modifier is about to be destroyed
*/
export class CustomModifierManager<O extends Owner, ModifierInstance>
  implements InternalModifierManager<CustomModifierState<ModifierInstance>> {
  private componentManagerDelegates = new WeakMap<O, ModifierManager<ModifierInstance>>();

  constructor(private factory: ManagerFactory<O, ModifierManager<ModifierInstance>>) {}

  private getDelegateFor(owner: O) {
    let { componentManagerDelegates } = this;
    let delegate = componentManagerDelegates.get(owner);

    if (delegate === undefined) {
      let { factory } = this;
      delegate = factory(owner);

      if (DEBUG && !FROM_CAPABILITIES!.has(delegate.capabilities)) {
        // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
        throw new Error(
          `Custom modifier managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.13' | '3.22')\` (imported via \`import { capabilities } from '@ember/modifier';\`). Received: \`${JSON.stringify(
            delegate.capabilities
          )}\` for: \`${delegate}\``
        );
      }

      componentManagerDelegates.set(owner, delegate);
    }

    return delegate;
  }

  create(owner: O, element: SimpleElement, definition: object, capturedArgs: CapturedArguments) {
    let delegate = this.getDelegateFor(owner);

    let { useArgsProxy, passFactoryToCreate } = delegate.capabilities;

    let argsProxy = argsProxyFor(capturedArgs, 'modifier');
    let args = useArgsProxy ? argsProxy : reifyArgs(capturedArgs);

    let instance: ModifierInstance;

    let factoryOrDefinition = definition;

    if (passFactoryToCreate) {
      // Make a fake factory. While not perfect, this should generally prevent
      // breakage in users of older modifier capabilities.
      factoryOrDefinition = {
        create(args: Record<string, unknown>) {
          let params = assign({}, args);
          setOwner(params, owner);

          return (definition as Factory).create(args);
        },

        class: definition,
      };
    }

    if (DEBUG && deprecateMutationsInTrackingTransaction !== undefined) {
      deprecateMutationsInTrackingTransaction(() => {
        instance = delegate.createModifier(factoryOrDefinition, args);
      });
    } else {
      instance = delegate.createModifier(factoryOrDefinition, args);
    }

    let tag = createUpdatableTag();
    let state: CustomModifierState<ModifierInstance>;

    if (useArgsProxy) {
      state = {
        tag,
        element,
        delegate,
        args,
        modifier: instance!,
      };
    } else {
      state = {
        tag,
        element,
        modifier: instance!,
        delegate,
        get args() {
          return reifyArgs(capturedArgs);
        },
      };
    }

    if (DEBUG) {
      state.debugName = typeof definition === 'function' ? definition.name : definition.toString();
    }

    registerDestructor(state, () => delegate.destroyModifier(instance, argsProxy));

    return state;
  }

  getDebugName({ debugName }: CustomModifierState<ModifierInstance>) {
    return debugName!;
  }

  getTag({ tag }: CustomModifierState<ModifierInstance>) {
    return tag;
  }

  install({ element, args, modifier, delegate }: CustomModifierState<ModifierInstance>) {
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.installModifier(modifier, castToBrowser(element, 'ELEMENT'), args));
    } else {
      delegate.installModifier(modifier, castToBrowser(element, 'ELEMENT'), args);
    }
  }

  update({ args, modifier, delegate }: CustomModifierState<ModifierInstance>) {
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.updateModifier(modifier, args));
    } else {
      delegate.updateModifier(modifier, args);
    }
  }

  getDestroyable(state: CustomModifierState<ModifierInstance>) {
    return state;
  }
}

export function reifyArgs({
  named,
  positional,
}: CapturedArguments): { named: Record<string, unknown>; positional: unknown[] } {
  let reifiedNamed = dict();

  for (let key in named) {
    reifiedNamed[key] = valueForRef(named[key]);
  }

  let reifiedPositional = positional.map(valueForRef);

  return {
    named: reifiedNamed,
    positional: reifiedPositional,
  };
}
