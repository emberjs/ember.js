import { DEBUG } from '@glimmer/env';
import {
  Arguments,
  CapturedArguments,
  InternalModifierManager,
  ModifierCapabilities,
  ModifierCapabilitiesVersions,
  ModifierManager,
  VMArguments,
} from '@glimmer/interfaces';
import { registerDestructor } from '@glimmer/destroyable';
import { valueForRef } from '@glimmer/reference';
import { createUpdatableTag, untrack, UpdatableTag } from '@glimmer/validator';
import { dict } from '@glimmer/util';
import { SimpleElement } from '@simple-dom/interface';
import { buildCapabilities } from '../util/capabilities';
import { argsProxyFor } from '../util/args-proxy';

export interface CustomModifierDefinitionState {
  ModifierClass: object;
  name: string;
}

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

export class CustomModifierDefinition<ModifierInstance> {
  public state: CustomModifierDefinitionState;

  constructor(
    public manager: CustomModifierManager<ModifierInstance>,
    public ModifierClass: object,
    public name: string
  ) {
    this.state = {
      ModifierClass,
      name,
    };
  }
}

export interface CustomModifierState<ModifierInstance> {
  tag: UpdatableTag;
  element: SimpleElement;
  modifier: ModifierInstance;
  args: Arguments;
  debugName?: string;
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
export class CustomModifierManager<ModifierInstance>
  implements
    InternalModifierManager<CustomModifierState<ModifierInstance>, CustomModifierDefinitionState> {
  constructor(private delegate: ModifierManager<ModifierInstance>) {}

  create(element: SimpleElement, definition: CustomModifierDefinitionState, vmArgs: VMArguments) {
    let { delegate } = this;
    let { ModifierClass } = definition;
    let capturedArgs = vmArgs.capture();

    let { useArgsProxy } = delegate.capabilities;

    let args = useArgsProxy ? argsProxyFor(capturedArgs, 'modifier') : reifyArgs(capturedArgs);
    let instance = delegate.createModifier(ModifierClass, args);

    let tag = createUpdatableTag();
    let state: CustomModifierState<ModifierInstance>;
    if (useArgsProxy) {
      state = {
        tag,
        element,
        args,
        modifier: instance,
      };
    } else {
      state = {
        tag,
        element,
        modifier: instance,
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

  install({ element, args, modifier }: CustomModifierState<ModifierInstance>) {
    let { delegate } = this;
    let { capabilities } = delegate;

    if (capabilities.disableAutoTracking === true) {
      untrack(() => delegate.installModifier(modifier, element, args));
    } else {
      delegate.installModifier(modifier, element, args);
    }
  }

  update({ args, modifier }: CustomModifierState<ModifierInstance>) {
    let { delegate } = this;
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
