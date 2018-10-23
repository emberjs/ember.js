import { Factory } from '@ember/-internals/owner';
import { Opaque } from '@glimmer/interfaces';
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
    public element: Element,
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
  installModifier(instance: ModifierInstance, element: Element, args: ManagerArgs): void;
  updateModifier(instance: ModifierInstance, args: ManagerArgs): void;
  destroyModifier(instance: ModifierInstance, args: ManagerArgs): void;
}

class CustomModifierManager<ModifierInstance>
  implements
    ModifierManager<
      CustomModifierState<ModifierInstance>,
      CustomModifierDefinitionState<ModifierInstance>
    > {
  create(
    element: Element,
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
