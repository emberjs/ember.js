import { Factory } from '@ember/-internals/owner';
import { Dict, Opaque, Simple } from '@glimmer/interfaces';
import { CONSTANT_TAG, Tag } from '@glimmer/reference';
import { Arguments, CapturedArguments, ModifierManager } from '@glimmer/runtime';

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

export class CustomModifierState<ModifierInstance> {
  constructor(
    public element: Simple.Element,
    public delegate: ModifierManagerDelegate<ModifierInstance>,
    public modifier: ModifierInstance,
    public args: CapturedArguments
  ) {}

  destroy() {
    const { delegate, modifier, args } = this;
    delegate.destroyModifier(modifier, args.value());
  }
}

// TODO: export ICapturedArgumentsValue from glimmer and replace this
export interface Args {
  named: Dict<Opaque>;
  positional: Opaque[];
}

export interface ModifierManagerDelegate<ModifierInstance> {
  capabilities: Capabilities;
  createModifier(factory: Opaque, args: Args): ModifierInstance;
  installModifier(instance: ModifierInstance, element: Simple.Element, args: Args): void;
  updateModifier(instance: ModifierInstance, args: Args): void;
  destroyModifier(instance: ModifierInstance, args: Args): void;
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
    element: Simple.Element,
    definition: CustomModifierDefinitionState<ModifierInstance>,
    args: Arguments
  ) {
    const capturedArgs = args.capture();
    let instance = definition.delegate.createModifier(
      definition.ModifierClass,
      capturedArgs.value()
    );
    return new CustomModifierState(element, definition.delegate, instance, capturedArgs);
  }

  getTag({ args }: CustomModifierState<ModifierInstance>): Tag {
    return args.tag;
  }

  install(state: CustomModifierState<ModifierInstance>) {
    let { element, args, delegate, modifier } = state;
    delegate.installModifier(modifier, element, args.value());
  }

  update(state: CustomModifierState<ModifierInstance>) {
    let { args, delegate, modifier } = state;
    delegate.updateModifier(modifier, args.value());
  }

  getDestructor(state: CustomModifierState<ModifierInstance>) {
    return state;
  }
}

class NonInteractiveCustomModifierManager<ModifierInstance>
  implements ModifierManager<null, CustomModifierDefinitionState<ModifierInstance>> {
  create() {
    return null;
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  install() {}

  update() {}

  getDestructor() {
    return null;
  }
}

const CUSTOM_INTERACTIVE_MODIFIER_MANAGER = new InteractiveCustomModifierManager();
const CUSTOM_NON_INTERACTIVE_MODIFIER_MANAGER = new NonInteractiveCustomModifierManager();
