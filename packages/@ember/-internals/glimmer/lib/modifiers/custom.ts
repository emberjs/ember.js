import { Factory } from '@ember/-internals/owner';
import { Opaque, Simple } from '@glimmer/interfaces';
import { Tag } from '@glimmer/reference';
import { Arguments, CapturedArguments, ModifierManager } from '@glimmer/runtime';
import { ManagerArgs, valueForCapturedArgs } from '../utils/managers';

export interface CustomModifierDefinitionState<ModifierInstance> {
  ModifierClass: Factory<ModifierInstance>;
  name: string;
  delegate: ModifierManagerDelegate<ModifierInstance>;
}

export interface Capabilities {}

// Currently there are no capabilities for modifiers
export function capabilities(_managerAPI: string, _optionalFeatures?: {}): Capabilities {
  return {};
}

export class CustomModifierDefinition<ModifierInstance> {
  public state: CustomModifierDefinitionState<ModifierInstance>;
  public manager = CUSTOM_MODIFIER_MANAGER;
  constructor(
    public name: string,
    public ModifierClass: Factory<ModifierInstance>,
    public delegate: ModifierManagerDelegate<ModifierInstance>
  ) {
    this.state = {
      ModifierClass,
      name,
      delegate,
    };
  }
}

export class CustomModifierState<ModifierInstance> {
  constructor(
    public element: Simple.Element,
    public delegate: ModifierManagerDelegate<ModifierInstance>,
    public modifier: ModifierInstance,
    public args: CapturedArguments
  ) {}

  destroy() {
    const { delegate, modifier, args } = this;
    let modifierArgs = valueForCapturedArgs(args);
    delegate.destroyModifier(modifier, modifierArgs);
  }
}

export interface ModifierManagerDelegate<ModifierInstance> {
  capabilities: Capabilities;
  createModifier(factory: Opaque, args: ManagerArgs): ModifierInstance;
  installModifier(instance: ModifierInstance, element: Simple.Element, args: ManagerArgs): void;
  updateModifier(instance: ModifierInstance, args: ManagerArgs): void;
  destroyModifier(instance: ModifierInstance, args: ManagerArgs): void;
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
class CustomModifierManager<ModifierInstance>
  implements
    ModifierManager<
      CustomModifierState<ModifierInstance>,
      CustomModifierDefinitionState<ModifierInstance>
    > {
  create(
    element: Simple.Element,
    definition: CustomModifierDefinitionState<ModifierInstance>,
    args: Arguments
  ) {
    const capturedArgs = args.capture();
    let modifierArgs = valueForCapturedArgs(capturedArgs);
    let instance = definition.delegate.createModifier(definition.ModifierClass, modifierArgs);
    return new CustomModifierState(element, definition.delegate, instance, capturedArgs);
  }

  getTag({ args }: CustomModifierState<ModifierInstance>): Tag {
    return args.tag;
  }

  install(state: CustomModifierState<ModifierInstance>) {
    let { element, args, delegate, modifier } = state;
    let modifierArgs = valueForCapturedArgs(args);
    delegate.installModifier(modifier, element, modifierArgs);
  }

  update(state: CustomModifierState<ModifierInstance>) {
    let { args, delegate, modifier } = state;
    let modifierArgs = valueForCapturedArgs(args);
    delegate.updateModifier(modifier, modifierArgs);
  }

  getDestructor(state: CustomModifierState<ModifierInstance>) {
    return state;
  }
}

const CUSTOM_MODIFIER_MANAGER = new CustomModifierManager();
