import { ComponentManager } from '@glimmer/interfaces';
import { Tag, VersionedPathReference } from '@glimmer/reference';
import { SimpleElement } from '@simple-dom/interface';
import ComponentCapabilities from '../component-capabilities';
import { ComponentDefinitionState, PreparedArguments } from '../components';
import { Destroyable, Option, SymbolDestroyable } from '../core';
import { Bounds } from '../dom/bounds';
import { SyntaxCompilationContext } from '../program';
import { VMArguments } from '../runtime/arguments';
import { ElementOperations } from '../runtime/element';
import { DynamicScope, Environment } from '../runtime/environment';
import { RuntimeResolver } from '../serialize';
import { CompilableProgram, CompilableTemplate } from '../template';
import { ProgramSymbolTable } from '../tier1/symbol-table';

export interface ComponentManager<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown,
  E extends Environment = Environment
> {
  getCapabilities(state: ComponentDefinitionState): ComponentCapabilities;

  // First, the component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(state: ComponentDefinitionState, args: VMArguments): Option<PreparedArguments>;

  // Then, the component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(
    env: E,
    state: ComponentDefinitionState,
    args: Option<VMArguments>,
    dynamicScope: Option<DynamicScope>,
    caller: Option<VersionedPathReference<unknown>>,
    hasDefaultBlock: boolean
  ): ComponentInstanceState;

  // Next, Glimmer asks the manager to create a reference for the `self`
  // it should use in the layout.
  getSelf(state: ComponentInstanceState): VersionedPathReference<unknown>;

  // Convert the opaque component into a `RevisionTag` that determins when
  // the component's update hooks need to be called (if at all).
  getTag(state: ComponentInstanceState): Tag;

  // This hook is run after the entire layout has been rendered.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didRenderLayout(state: ComponentInstanceState, bounds: Bounds): void;

  // Once the whole top-down rendering process is complete, Glimmer invokes
  // the `didCreate` callbacks.
  didCreate(state: ComponentInstanceState): void;

  // When the component's tag has invalidated, the manager's `update` hook is
  // called.
  update(state: ComponentInstanceState, dynamicScope: Option<DynamicScope>): void;

  // This hook is run after the entire layout has been updated.
  //
  // Hosts should use `didUpdate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didUpdateLayout(state: ComponentInstanceState, bounds: Bounds): void;

  // Finally, once top-down revalidation has completed, Glimmer invokes
  // the `didUpdate` callbacks on components that changed.
  didUpdate(state: ComponentInstanceState): void;

  // Convert the opaque component into an object that implements Destructor.
  // If it returns null, the component will not be destroyed.
  getDestructor(state: ComponentInstanceState): Option<SymbolDestroyable | Destroyable>;
}

export interface WithAotStaticLayout<
  ComponentInstanceState,
  ComponentDefinitionState,
  R extends RuntimeResolver
> extends ComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  getAotStaticLayout(state: ComponentDefinitionState, resolver: R): Invocation;
}

export interface WithJitStaticLayout<
  ComponentInstanceState,
  ComponentDefinitionState,
  R extends RuntimeResolver
> extends ComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  getJitStaticLayout(state: ComponentDefinitionState, resolver: R): CompilableProgram;
}

export interface WithJitDynamicLayout<Component, R extends RuntimeResolver>
  extends ComponentManager<Component, unknown> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getJitDynamicLayout(
    component: Component,
    resolver: R,
    context: SyntaxCompilationContext
  ): CompilableTemplate;
}

export interface WithAotDynamicLayout<Component, R extends RuntimeResolver>
  extends ComponentManager<Component, unknown> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getAotDynamicLayout(component: Component, resolver: R): Invocation;
}

export interface WithDynamicTagName<Component> extends ComponentManager<Component, unknown> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: Component): Option<string>;
}

export interface WithAttributeHook<Component, Definition>
  extends ComponentManager<Component, Definition> {
  didSplatAttributes(component: Component, element: Component, operations: ElementOperations): void;
}

export interface WithElementHook<Component>
  extends ComponentManager<Component, ComponentDefinitionState> {
  // The `didCreateElement` hook is run for non-tagless components after the
  // element as been created, but before it has been appended ("flushed") to
  // the DOM. This hook allows the manager to save off the element, as well as
  // install other dynamic attributes via the ElementOperations object.
  //
  // Hosts should use `didCreate`, which runs asynchronously after the rendering
  // process, to provide hooks for user code.
  didCreateElement(
    component: Component,
    element: SimpleElement,
    operations: ElementOperations
  ): void;
}

export interface Invocation {
  handle: number;
  symbolTable: ProgramSymbolTable;
}
