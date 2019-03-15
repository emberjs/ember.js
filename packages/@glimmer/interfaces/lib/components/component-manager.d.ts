import { Tag, VersionedPathReference } from '@glimmer/reference';
import { SimpleElement } from '@simple-dom/interface';
import ComponentCapabilities from '../component-capabilities';
import { ComponentDefinitionState, PreparedArguments, ComponentInstanceState } from '../components';
import { Destroyable, Option, SymbolDestroyable } from '../core';
import { Bounds } from '../dom/bounds';
import { SyntaxCompilationContext } from '../program';
import { VMArguments } from '../runtime/arguments';
import { ElementOperations } from '../runtime/element';
import { DynamicScope, Environment } from '../runtime/environment';
import { RuntimeResolverDelegate, JitRuntimeResolver, RuntimeResolver } from '../serialize';
import { CompilableProgram, CompilableTemplate, Template } from '../template';
import { ProgramSymbolTable } from '../tier1/symbol-table';

export interface ComponentManager<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown
> {
  getCapabilities(state: ComponentDefinitionState): ComponentCapabilities;
  getSelf(state: ComponentInstanceState): VersionedPathReference<unknown>;
  getDestructor(state: ComponentInstanceState): Option<SymbolDestroyable | Destroyable>;
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
  E extends Environment = Environment
> extends ComponentManager<ComponentInstanceState> {
  // The component manager is asked to create a bucket of state for
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

  // Convert the opaque component into a `RevisionTag` that determins when
  // the component's update hooks need to be called (if at all).
  getTag(state: ComponentInstanceState): Tag;

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

// export interface ComponentManager<
//   ComponentInstanceState = unknown,
//   ComponentDefinitionState = unknown,
//   E extends Environment = Environment
// > {
//   getCapabilities(state: ComponentDefinitionState): ComponentCapabilities;

//   // First, the component manager is asked to prepare the arguments needed
//   // for `create`. This allows for things like closure components where the
//   // args need to be curried before constructing the instance of the state
//   // bucket.
//   prepareArgs(state: ComponentDefinitionState, args: VMArguments): Option<PreparedArguments>;

//   // Then, the component manager is asked to create a bucket of state for
//   // the supplied arguments. From the perspective of Glimmer, this is
//   // an opaque token, but in practice it is probably a component object.
//   create(
//     env: E,
//     state: ComponentDefinitionState,
//     args: Option<VMArguments>,
//     dynamicScope: Option<DynamicScope>,
//     caller: Option<VersionedPathReference<unknown>>,
//     hasDefaultBlock: boolean
//   ): ComponentInstanceState;

//   // Next, Glimmer asks the manager to create a reference for the `self`
//   // it should use in the layout.
//   getSelf(state: ComponentInstanceState): VersionedPathReference<unknown>;

//   // Convert the opaque component into a `RevisionTag` that determins when
//   // the component's update hooks need to be called (if at all).
//   getTag(state: ComponentInstanceState): Tag;

//   // This hook is run after the entire layout has been rendered.
//   //
//   // Hosts should use `didCreate`, which runs asynchronously after the rendering
//   // process, to provide hooks for user code.
//   didRenderLayout(state: ComponentInstanceState, bounds: Bounds): void;

//   // Once the whole top-down rendering process is complete, Glimmer invokes
//   // the `didCreate` callbacks.
//   didCreate(state: ComponentInstanceState): void;

//   // When the component's tag has invalidated, the manager's `update` hook is
//   // called.
//   update(state: ComponentInstanceState, dynamicScope: Option<DynamicScope>): void;

//   // This hook is run after the entire layout has been updated.
//   //
//   // Hosts should use `didUpdate`, which runs asynchronously after the rendering
//   // process, to provide hooks for user code.
//   didUpdateLayout(state: ComponentInstanceState, bounds: Bounds): void;

//   // Finally, once top-down revalidation has completed, Glimmer invokes
//   // the `didUpdate` callbacks on components that changed.
//   didUpdate(state: ComponentInstanceState): void;

//   // Convert the opaque component into an object that implements Destructor.
//   // If it returns null, the component will not be destroyed.
//   getDestructor(state: ComponentInstanceState): Option<SymbolDestroyable | Destroyable>;
// }

export interface WithAotStaticLayout<
  I = ComponentInstanceState,
  D = ComponentDefinitionState,
  R extends RuntimeResolverDelegate = RuntimeResolverDelegate
> extends ComponentManager<I, D> {
  getAotStaticLayout(state: D, resolver: R): Invocation;
}

export interface WithJitStaticLayout<
  I = ComponentInstanceState,
  D = ComponentDefinitionState,
  R extends JitRuntimeResolver = JitRuntimeResolver
> extends ComponentManager<I, D> {
  getJitStaticLayout(state: D, resolver: R): CompilableProgram;
}

export interface WithJitDynamicLayout<
  I = ComponentInstanceState,
  R extends RuntimeResolverDelegate = RuntimeResolverDelegate
> extends ComponentManager<I> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getJitDynamicLayout(component: I, resolver: R, context: SyntaxCompilationContext): Template;
}

export interface WithAotDynamicLayout<
  I = ComponentInstanceState,
  R extends RuntimeResolver = RuntimeResolver
> extends ComponentManager<I> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getAotDynamicLayout(component: I, resolver: R): Invocation;
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
