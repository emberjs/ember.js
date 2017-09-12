import { Simple, Dict, Opaque, Option, RuntimeResolver, Unique, ProgramSymbolTable, VMHandle } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { Destroyable } from '@glimmer/util';
import { ComponentCapabilities } from '@glimmer/opcode-compiler';
import Bounds from '../bounds';
import { ElementOperations } from '../vm/element-builder';
import Environment, { DynamicScope } from '../environment';
import { IArguments } from '../vm/arguments';
import { CurriedComponentDefinition } from "@glimmer/runtime";

export interface PreparedArguments {
  positional: Array<VersionedPathReference<Opaque>>;
  named: Dict<VersionedPathReference<Opaque>>;
}

export type ComponentDefinitionState = Unique<'ComponentDefinitionState'>;
export type ComponentInstanceState = Unique<'ComponentInstanceState'>;

/** @internal */
export interface ComponentDefinition {
  state: ComponentDefinitionState;
  manager: InternalComponentManager;
}

export interface PublicComponentDefinition<StaticComponentState = Opaque, Manager = ComponentManager<Opaque, StaticComponentState>> {
  state: StaticComponentState;
  manager: Manager;
}

export interface ComponentManager<InstanceState, StaticState> {
  getCapabilities(state: StaticState): ComponentCapabilities;

  // First, the component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(state: StaticState, args: IArguments): Option<PreparedArguments>;

  // Then, the component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(env: Environment, state: StaticState, args: Option<IArguments>, dynamicScope: DynamicScope, caller: VersionedPathReference<Opaque>, hasDefaultBlock: boolean): InstanceState;

  // Next, Glimmer asks the manager to create a reference for the `self`
  // it should use in the layout.
  getSelf(state: InstanceState): VersionedPathReference<Opaque>;

  // Convert the opaque component into a `RevisionTag` that determins when
  // the component's update hooks need to be called (if at all).
  getTag(state: InstanceState): Tag;

  // This hook is run after the entire layout has been rendered.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didRenderLayout(state: InstanceState, bounds: Bounds): void;

  // Once the whole top-down rendering process is complete, Glimmer invokes
  // the `didCreate` callbacks.
  didCreate(state: InstanceState): void;

  // When the component's tag has invalidated, the manager's `update` hook is
  // called.
  update(state: InstanceState, dynamicScope: DynamicScope): void;

  // This hook is run after the entire layout has been updated.
  //
  // Hosts should use `didUpdate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didUpdateLayout(state: InstanceState, bounds: Bounds): void;

  // Finally, once top-down revalidation has completed, Glimmer invokes
  // the `didUpdate` callbacks on components that changed.
  didUpdate(state: InstanceState): void;

  // Convert the opaque component into an object that implements Destroyable.
  // If it returns null, the component will not be destroyed.
  getDestructor(state: InstanceState): Option<Destroyable>;
}

export interface Invocation {
  handle: VMHandle;
  symbolTable: ProgramSymbolTable;
}

export interface WithDynamicTagName<Component> extends ComponentManager<Component, Opaque> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: Component): Option<string>;
}

export interface WithStaticLayout<Component, Definition, Specifier, R extends RuntimeResolver<Specifier>> extends ComponentManager<Component, Definition> {
  getLayout(definition: Definition, resolver: R): Invocation;
}

export interface WithAttributeHook<Component, Definition> extends ComponentManager<Component, Definition> {
  didSplatAttributes(component: Component, element: Component, operations: ElementOperations): void;
}

export interface WithElementHook<Component> extends ComponentManager<Component, ComponentDefinitionState> {
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
export function hasStaticLayout<C, Definition extends ComponentDefinition>(definition: Definition, manager: ComponentManager<C, Definition>): manager is WithStaticLayout<C, Definition, Opaque, RuntimeResolver<Opaque>> {
  return manager.getCapabilities(definition).dynamicLayout === false;
}

export interface WithDynamicLayout<Component, Specifier, R extends RuntimeResolver<Specifier>> extends ComponentManager<Component, Opaque> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getLayout(component: Component, resolver: R): Invocation;
}

/** @internal */
export function hasDynamicLayout<Component>(definition: ComponentDefinition, manager: ComponentManager<Component, ComponentDefinition>): manager is WithDynamicLayout<Component, Opaque, RuntimeResolver<Opaque>> {
  return manager.getCapabilities(definition).dynamicLayout === true;
}

export interface WithStaticDefinitions<ComponentDefinition> extends ComponentManager<Opaque, ComponentDefinition> {
  getComponentDefinition(definition: ComponentDefinition, handle: VMHandle): ComponentDefinition;
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

export type BrandedComponentDefinition = CurriedComponentDefinition;
export type InternalComponent = ComponentInstanceState;
export type InternalComponentManager = ComponentManager<ComponentInstanceState, ComponentDefinitionState>;
