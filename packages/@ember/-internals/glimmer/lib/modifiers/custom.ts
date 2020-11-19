import { Factory } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Arguments, ModifierManager, VMArguments } from '@glimmer/interfaces';
import { registerDestructor, reifyArgs } from '@glimmer/runtime';
import {
  createUpdatableTag,
  deprecateMutationsInTrackingTransaction,
  untrack,
  UpdatableTag,
} from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { argsProxyFor } from '../utils/args-proxy';

export interface CustomModifierDefinitionState<ModifierInstance> {
  ModifierClass: Factory<ModifierInstance>;
  name: string;
  delegate: ModifierManagerDelegate<ModifierInstance>;
}

export interface OptionalCapabilities {
  '3.13': {
    disableAutoTracking?: boolean;
  };

  // passes factoryFor(...).class to `.createModifier`
  // uses args proxy, does not provide a way to opt-out
  '3.22': {
    disableAutoTracking?: boolean;
  };
}

export interface Capabilities {
  disableAutoTracking: boolean;
  useArgsProxy: boolean;
  passFactoryToCreate: boolean;
}

export function capabilities<Version extends keyof OptionalCapabilities>(
  managerAPI: Version,
  optionalFeatures: OptionalCapabilities[Version] = {}
): Capabilities {
  assert(
    'Invalid modifier manager compatibility specified',
    managerAPI === '3.13' || managerAPI === '3.22'
  );

  return {
    disableAutoTracking: Boolean(optionalFeatures.disableAutoTracking),
    useArgsProxy: managerAPI === '3.13' ? false : true,
    passFactoryToCreate: managerAPI === '3.13',
  };
}

export class CustomModifierDefinition<ModifierInstance> {
  public state: CustomModifierDefinitionState<ModifierInstance>;
  public manager: ModifierManager<unknown | null, CustomModifierDefinitionState<ModifierInstance>>;

  constructor(
    public name: string,
    public ModifierClass: Factory<ModifierInstance>,
    public delegate: ModifierManagerDelegate<ModifierInstance>,
    isInteractive: boolean
  ) {
    this.state = {
      ModifierClass,
      name,
      delegate,
    };

    this.manager = isInteractive
      ? CUSTOM_INTERACTIVE_MODIFIER_MANAGER
      : CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER;
  }
}

export interface CustomModifierState<ModifierInstance> {
  tag: UpdatableTag;
  element: SimpleElement;
  delegate: ModifierManagerDelegate<ModifierInstance>;
  modifier: ModifierInstance;
  args: Arguments;
  debugName?: string;
}

export interface ModifierManagerDelegate<ModifierInstance> {
  capabilities: Capabilities;
  createModifier(factory: unknown, args: Arguments): ModifierInstance;
  installModifier(instance: ModifierInstance, element: SimpleElement, args: Arguments): void;
  updateModifier(instance: ModifierInstance, args: Arguments): void;
  destroyModifier(instance: ModifierInstance, args: Arguments): void;
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
class InteractiveCustomModifierManager<ModifierInstance>
  implements
    ModifierManager<
      CustomModifierState<ModifierInstance>,
      CustomModifierDefinitionState<ModifierInstance>
    > {
  create(
    element: SimpleElement,
    definition: CustomModifierDefinitionState<ModifierInstance>,
    vmArgs: VMArguments
  ) {
    let { delegate, ModifierClass } = definition;
    let capturedArgs = vmArgs.capture();

    assert(
      'Custom modifier managers must define their capabilities using the capabilities() helper function',
      typeof delegate.capabilities === 'object' && delegate.capabilities !== null
    );

    let { useArgsProxy, passFactoryToCreate } = delegate.capabilities;

    let args = useArgsProxy ? argsProxyFor(capturedArgs, 'modifier') : reifyArgs(capturedArgs);

    let instance: ModifierInstance;

    if (DEBUG && deprecateMutationsInTrackingTransaction !== undefined) {
      deprecateMutationsInTrackingTransaction(() => {
        instance = delegate.createModifier(
          passFactoryToCreate ? ModifierClass : ModifierClass.class,
          args
        );
      });
    } else {
      instance = delegate.createModifier(
        passFactoryToCreate ? ModifierClass : ModifierClass.class,
        args
      );
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
        delegate,
        modifier: instance!,
        get args() {
          return reifyArgs(capturedArgs);
        },
      };
    }

    if (DEBUG) {
      state.debugName = definition.name;
    }

    registerDestructor(state, () => delegate.destroyModifier(instance, state.args));

    return state;
  }

  getDebugName({ debugName }: CustomModifierState<ModifierInstance>) {
    return debugName!;
  }

  getTag({ tag }: CustomModifierState<ModifierInstance>) {
    return tag;
  }

  install(state: CustomModifierState<ModifierInstance>) {
    let { element, args, delegate, modifier } = state;

    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.installModifier(modifier, element, args));
    } else {
      delegate.installModifier(modifier, element, args);
    }
  }

  update(state: CustomModifierState<ModifierInstance>) {
    let { args, delegate, modifier } = state;
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

class NonInteractiveCustomModifierManager<ModifierInstance>
  implements ModifierManager<null, CustomModifierDefinitionState<ModifierInstance>> {
  create() {
    return null;
  }

  getDebugName() {
    return '';
  }

  getTag() {
    return null;
  }

  install() {}

  update() {}

  getDestroyable() {
    return null;
  }
}

const CUSTOM_INTERACTIVE_MODIFIER_MANAGER = new InteractiveCustomModifierManager();
const CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER = new NonInteractiveCustomModifierManager();
