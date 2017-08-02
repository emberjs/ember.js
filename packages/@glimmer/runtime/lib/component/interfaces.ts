import { Simple, Dict, Opaque, Option, Resolver, Unique } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Destroyable } from '@glimmer/util';
import { ComponentCapabilities } from '@glimmer/opcode-compiler';
import Bounds from '../bounds';
import { ElementOperations } from '../vm/element-builder';
import Environment, { DynamicScope } from '../environment';
import { IArguments, ICapturedArguments, Arguments } from '../vm/arguments';

export interface PreparedArguments {
  positional: Array<VersionedPathReference<Opaque>>;
  named: Dict<VersionedPathReference<Opaque>>;
}

export interface ComponentManager<Component> {
  // First, the component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(definition: ComponentDefinition<Component>, args: IArguments): Option<PreparedArguments>;

  // Then, the component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(env: Environment, definition: ComponentDefinition<Component>, args: Option<IArguments>, dynamicScope: DynamicScope, caller: VersionedPathReference<Opaque>, hasDefaultBlock: boolean): Component;

  // Next, Glimmer asks the manager to create a reference for the `self`
  // it should use in the layout.
  getSelf(component: Component): VersionedPathReference<Opaque>;

  // Convert the opaque component into a `RevisionTag` that determins when
  // the component's update hooks need to be called (if at all).
  getTag(component: Component): Tag;

  // This hook is run after the entire layout has been rendered.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didRenderLayout(component: Component, bounds: Bounds): void;

  // Once the whole top-down rendering process is complete, Glimmer invokes
  // the `didCreate` callbacks.
  didCreate(component: Component): void;

  // When the component's tag has invalidated, the manager's `update` hook is
  // called.
  update(component: Component, dynamicScope: DynamicScope): void;

  // This hook is run after the entire layout has been updated.
  //
  // Hosts should use `didUpdate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didUpdateLayout(component: Component, bounds: Bounds): void;

  // Finally, once top-down revalidation has completed, Glimmer invokes
  // the `didUpdate` callbacks on components that changed.
  didUpdate(component: Component): void;

  // Convert the opaque component into an object that implements Destroyable.
  // If it returns null, the component will not be destroyed.
  getDestructor(component: Component): Option<Destroyable>;
}

export interface WithDynamicTagName<Component> extends ComponentManager<Component> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: Component): Option<string>;
}

export interface WithStaticLayout<Component, Specifier, R extends Resolver<Specifier>> extends ComponentManager<Component> {
  getLayout(definition: ComponentDefinition<Component>, resolver: R): Specifier;
}

export interface WithAttributeHook<Component> extends ComponentManager<Component> {
  didSplatAttributes(component: Component, element: Component, operations: ElementOperations): void;
}

export interface WithElementHook<Component> extends ComponentManager<Component> {
  // The `didCreateElement` hook is run for non-tagless components after the
  // element as been created, but before it has been appended ("flushed") to
  // the DOM. This hook allows the manager to save off the element, as well as
  // install other dynamic attributes via the ElementOperations object.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didCreateElement(component: Component, element: Simple.Element, operations: ElementOperations): void;
}

export function hasStaticLayout<T>(definition: ComponentDefinition<T>, _: ComponentManager<T>): _ is WithStaticLayout<T, Unique<'Specifier'>, Resolver<Unique<'Specifier'>>> {
  return definition.capabilities.dynamicLayout === false;
}

export interface WithDynamicLayout<Component, Specifier, R extends Resolver<Specifier>> extends ComponentManager<Component> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getLayout(component: Component, resolver: R): Specifier;
}

export function hasDynamicLayout<T>(definition: ComponentDefinition<T>, _: ComponentManager<T>): _ is WithDynamicLayout<T, Unique<'Specifier'>, Resolver<Unique<'Specifier'>>> {
  return definition.capabilities.dynamicLayout === true;
}

const COMPONENT_DEFINITION_BRAND = 'COMPONENT DEFINITION [id=e59c754e-61eb-4392-8c4a-2c0ac72bfcd4]';

export function isComponentDefinition<T = Unique<'Component'>>(obj: Opaque): obj is ComponentDefinition<T> {
  return typeof obj === 'object' && obj !== null && obj[COMPONENT_DEFINITION_BRAND];
}

const ALL_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: false,
  elementHook: false
};

export abstract class ComponentDefinition<T> {
  public name: string; // for debugging
  public manager: ComponentManager<T>;
  public capabilities: ComponentCapabilities = ALL_CAPABILITIES;

  constructor(name: string, manager: ComponentManager<T>) {
    this[COMPONENT_DEFINITION_BRAND] = true;
    this.name = name;
    this.manager = manager;
  }
}

const CURRIED_COMPONENT_DEFINITION_BRAND = 'CURRIED COMPONENT DEFINITION [id=6f00feb9-a0ef-4547-99ea-ac328f80acea]';

export function isCurriedComponentDefinition<T>(definition: ComponentDefinition<T>): definition is CurriedComponentDefinition<T> {
  return definition[CURRIED_COMPONENT_DEFINITION_BRAND];
}

export class CurriedComponentDefinition<T> extends ComponentDefinition<T> {
  constructor(protected inner: ComponentDefinition<T>, protected args: ICapturedArguments) {
    super(CURRIED_COMPONENT_DEFINITION_BRAND, null as any);
    this[CURRIED_COMPONENT_DEFINITION_BRAND] = true;
  }

  unwrap(args: Arguments): ComponentDefinition<T> {
    args.realloc(this.offset);

    let definition: ComponentDefinition<T> = this;

    while (isCurriedComponentDefinition(definition)) {
      let { args: { positional, named }, inner } = definition;

      args.positional.prepend(positional);
      args.named.merge(named);

      definition = inner;
    }

    return definition;
  }

  protected get offset(): number {
    let { inner, args: { positional: { length } } } = this;
    return isCurriedComponentDefinition(inner) ? length + inner.offset : length;
  }
}

export type InternalComponent = Unique<'Component'>;
export type InternalComponentManager = ComponentManager<InternalComponent>;
export type InternalComponentDefinition = ComponentDefinition<InternalComponent>;
