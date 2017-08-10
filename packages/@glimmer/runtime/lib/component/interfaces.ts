import { Simple, Dict, Opaque, Option, Resolver, Unique } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Destroyable } from '@glimmer/util';
import { ComponentCapabilities, Handle } from '@glimmer/opcode-compiler';
import Bounds from '../bounds';
import { ElementOperations } from '../vm/element-builder';
import Environment, { DynamicScope } from '../environment';
import { IArguments, ICapturedArguments, Arguments } from '../vm/arguments';

export interface PreparedArguments {
  positional: Array<VersionedPathReference<Opaque>>;
  named: Dict<VersionedPathReference<Opaque>>;
}

// TODO: Think about renaming the concepts:
//
// - ComponentDefinition (opaque static state bucket)
// - Component           (opaque instance state bucket)
// - ComponentManager    (same thing)
// - ComponentSpec       (pair of definition / manager)
export type ComponentDefinition = Unique<'ComponentDefinition'>;

/** @internal */
export interface ComponentSpec {
  definition: ComponentDefinition;
  manager: InternalComponentManager;
}

export interface PublicComponentSpec<Definition = Opaque, Manager = ComponentManager<Opaque, Definition>> {
  definition: Definition;
  manager: Manager;
}

export interface ComponentManager<Component, Definition> {
  getCapabilities(definition: Definition): ComponentCapabilities;

  // First, the component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(definition: Definition, args: IArguments): Option<PreparedArguments>;

  // Then, the component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(env: Environment, definition: Definition, args: Option<IArguments>, dynamicScope: DynamicScope, caller: VersionedPathReference<Opaque>, hasDefaultBlock: boolean): Component;

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

export interface WithDynamicTagName<Component> extends ComponentManager<Component, Opaque> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: Component): Option<string>;
}

export interface WithStaticLayout<Component, Definition, Specifier, R extends Resolver<Specifier>> extends ComponentManager<Component, Definition> {
  getLayout(definition: Definition, resolver: R): Specifier;
}

export interface WithAttributeHook<Component, Definition> extends ComponentManager<Component, Definition> {
  didSplatAttributes(component: Component, element: Component, operations: ElementOperations): void;
}

export interface WithElementHook<Component> extends ComponentManager<Component, ComponentDefinition> {
  // The `didCreateElement` hook is run for non-tagless components after the
  // element as been created, but before it has been appended ("flushed") to
  // the DOM. This hook allows the manager to save off the element, as well as
  // install other dynamic attributes via the ElementOperations object.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didCreateElement(component: Component, element: Simple.Element, operations: ElementOperations): void;
}

/** @internal */
export function hasStaticLayout<C, Definition extends ComponentDefinition>(definition: Definition, manager: ComponentManager<C, Definition>): manager is WithStaticLayout<C, Definition, Unique<'Specifier'>, Resolver<Unique<'Specifier'>>> {
  return manager.getCapabilities(definition).dynamicLayout === false;
}

export interface WithDynamicLayout<Component, Specifier, R extends Resolver<Specifier>> extends ComponentManager<Component, Opaque> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getLayout(component: Component, resolver: R): Specifier;
}

/** @internal */
export function hasDynamicLayout<Component>(definition: ComponentDefinition, manager: ComponentManager<Component, ComponentDefinition>): manager is WithDynamicLayout<Component, Unique<'Specifier'>, Resolver<Unique<'Specifier'>>> {
  return manager.getCapabilities(definition).dynamicLayout === true;
}

export interface WithStaticDefinitions<ComponentDefinition> extends ComponentManager<Opaque, ComponentDefinition> {
  getComponentDefinition(definition: ComponentDefinition, handle: Handle): ComponentDefinition;
}

/** @internal */
export function hasStaticDefinitions<ComponentDefinition>(definition: ComponentDefinition, manager: ComponentManager<Opaque, ComponentDefinition>): manager is WithStaticDefinitions<ComponentDefinition> {
  return manager.getCapabilities(definition).staticDefinitions === true;
}

export const DEFAULT_CAPABILITIES: ComponentCapabilities = {
  staticDefinitions: false,
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: false,
  elementHook: false
};

const CURRIED_COMPONENT_DEFINITION_BRAND = 'CURRIED COMPONENT DEFINITION [id=6f00feb9-a0ef-4547-99ea-ac328f80acea]';

export function isCurriedComponentDefinition(definition: Opaque): definition is CurriedComponentDefinition {
  return !!(definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND]);
}

export function isComponentDefinition(definition: Opaque): definition is CurriedComponentDefinition {
  return definition && definition[CURRIED_COMPONENT_DEFINITION_BRAND];
}

export class CurriedComponentDefinition {
  /** @internal */
  constructor(protected inner: ComponentSpec | CurriedComponentDefinition, protected args: Option<ICapturedArguments>) {
    this[CURRIED_COMPONENT_DEFINITION_BRAND] = true;
  }

  unwrap(args: Arguments): ComponentSpec {
    args.realloc(this.offset);

    let definition: CurriedComponentDefinition = this;

    while (true) {
      let { args: curriedArgs, inner } = definition;

      if (curriedArgs) {
        args.positional.prepend(curriedArgs.positional);
        args.named.merge(curriedArgs.named);
      }

      if (!isCurriedComponentDefinition(inner)) {
        return inner;
      }

      definition = inner;
    }
  }

  /** @internal */
  get offset(): number {
    let { inner, args } = this;
    let length = args ? args.length : 0;
    return isCurriedComponentDefinition(inner) ? length + inner.offset : length;
  }
}

export type BrandedComponentDefinition = CurriedComponentDefinition;
export type InternalComponent = Unique<'Component'>;
export type InternalComponentManager = ComponentManager<InternalComponent, ComponentDefinition>;
