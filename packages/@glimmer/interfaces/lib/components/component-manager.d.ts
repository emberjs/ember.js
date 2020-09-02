// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { SimpleElement } from '@simple-dom/interface';
import ComponentCapabilities from '../component-capabilities';
import { ComponentDefinitionState, PreparedArguments, ComponentInstanceState } from '../components';
import { Option, Destroyable } from '../core';
import { Bounds } from '../dom/bounds';
import { VMArguments } from '../runtime/arguments';
import { ElementOperations } from '../runtime/element';
import { Environment } from '../runtime/environment';
import { RuntimeResolver } from '../serialize';
import { CompilableProgram, Template } from '../template';
import { ProgramSymbolTable } from '../tier1/symbol-table';
import { DynamicScope } from '../runtime/scope';

export interface ComponentManager<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown
> {
  getCapabilities(state: ComponentDefinitionState): ComponentCapabilities;
  getSelf(state: ComponentInstanceState): Reference;
  getDestroyable(state: ComponentInstanceState): Option<Destroyable>;
  getDebugName(state: ComponentDefinitionState): string;
}

export interface WithPrepareArgs<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown
> extends ComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  // The component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure> components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(state: ComponentDefinitionState, args: VMArguments): Option<PreparedArguments>;
}

export interface WithCreateInstance<
  ComponentInstanceState = unknown,
  E extends Environment = Environment,
  ComponentDefinitionState = unknown
> extends ComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  // The component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(
    env: E,
    state: ComponentDefinitionState,
    args: Option<VMArguments>,
    dynamicScope: Option<DynamicScope>,
    caller: Option<Reference>,
    hasDefaultBlock: boolean
  ): ComponentInstanceState;

  // This hook is run after the entire layout has been rendered.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didRenderLayout(state: ComponentInstanceState, bounds: Bounds): void;

  // This hook is run after the entire layout has been updated.
  //
  // Hosts should use `didUpdate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didUpdateLayout(state: ComponentInstanceState, bounds: Bounds): void;

  // Once the whole top-down rendering process is complete, Glimmer invokes
  // the `didCreate` callbacks.
  didCreate(state: ComponentInstanceState): void;

  // Finally, once top-down revalidation has completed, Glimmer invokes
  // the `didUpdate` callbacks on components that changed.
  didUpdate(state: ComponentInstanceState): void;
}

export interface WithUpdateHook<ComponentInstanceState = unknown>
  extends ComponentManager<ComponentInstanceState> {
  // When the component's tag has invalidated, the manager's `update` hook is
  // called.
  update(state: ComponentInstanceState, dynamicScope: Option<DynamicScope>): void;
}

export interface WithStaticLayout<
  I = ComponentInstanceState,
  D = ComponentDefinitionState,
  R extends RuntimeResolver = RuntimeResolver
> extends ComponentManager<I, D> {
  getStaticLayout(state: D, resolver: R): CompilableProgram;
}

export interface WithDynamicLayout<
  I = ComponentInstanceState,
  R extends RuntimeResolver = RuntimeResolver
> extends ComponentManager<I> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getDynamicLayout(component: I, resolver: R): Template;
}

export interface WithDynamicTagName<ComponentInstanceState>
  extends ComponentManager<ComponentInstanceState> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: ComponentInstanceState): Option<string>;
}

export interface WithAttributeHook<ComponentInstanceState>
  extends ComponentManager<ComponentInstanceState> {
  didSplatAttributes(
    component: ComponentInstanceState,
    element: ComponentInstanceState,
    operations: ElementOperations
  ): void;
}

export interface WithElementHook<ComponentInstanceState>
  extends ComponentManager<ComponentInstanceState> {
  // The `didCreateElement` hook is run for non-tagless components after the
  // element as been created, but before it has been appended ("flushed") to
  // the DOM. This hook allows the manager to save off the element, as well as
  // install other dynamic attributes via the ElementOperations object.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didCreateElement(
    component: ComponentInstanceState,
    element: SimpleElement,
    operations: ElementOperations
  ): void;
}

export interface Invocation {
  handle: number;
  symbolTable: ProgramSymbolTable;
}
