// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { SimpleElement } from '@simple-dom/interface';
import {
  ComponentDefinitionState,
  PreparedArguments,
  ComponentInstanceState,
} from '../../components';
import { Option, Destroyable } from '../../core';
import { Bounds } from '../../dom/bounds';
import { CapturedArguments, VMArguments } from '../../runtime/arguments';
import { ElementOperations } from '../../runtime/element';
import { Environment } from '../../runtime/environment';
import { RuntimeResolver } from '../../serialize';
import { Template } from '../../template';
import { ProgramSymbolTable } from '../../tier1/symbol-table';
import { DynamicScope } from '../../runtime/scope';
import { RenderNode } from '../../runtime/debug-render-tree';

/**
 * Describes the capabilities of a particular component. The capabilities are
 * provided to the Glimmer compiler and VM via the ComponentDefinition, which
 * includes a ComponentCapabilities record.
 *
 * Certain features in the VM come with some overhead, so the compiler and
 * runtime use this information to skip unnecessary work for component types
 * that don't need it.
 *
 * For example, a component that is template-only (i.e., it does not have an
 * associated JavaScript class to instantiate) can skip invoking component
 * manager hooks related to lifecycle events by setting the `elementHook`
 * capability to `false`.
 */
export interface InternalComponentCapabilities {
  /**
   * Whether a component's template is static across all instances of that
   * component, or can vary per instance. This should usually be `false` except
   * for cases of backwards-compatibility.
   */
  dynamicLayout: boolean;

  /**
   * Whether a "wrapped" component's root element can change after being
   * rendered. This flag is only used by the WrappedBuilder and should be
   * `false` except for cases of backwards-compatibility.
   */
  dynamicTag: boolean;

  wrapped: boolean;

  /**
   * Setting the `prepareArgs` flag to true enables the `prepareArgs` hook on
   * the component manager, which would otherwise not be called.
   *
   * The component manager's `prepareArgs` hook allows it to programmatically
   * add or remove positional and named arguments for a component before the
   * component is invoked. This flag should usually be `false` except for cases
   * of backwards-compatibility.
   */
  prepareArgs: boolean;

  /**
   * Whether a reified `Arguments` object will get passed to the component
   * manager's `create` hook. If a particular component does not access passed
   * arguments from JavaScript (via the `this.args` property in Glimmer.js, for
   * example), this flag can be set to `false` to avoid the work of
   * instantiating extra data structures to expose the arguments to JavaScript.
   */
  createArgs: boolean;

  /**
   * Whether the component needs the caller component
   */
  createCaller: boolean;

  /**
   * Whether to call the `didSplatAttributes` hook on the component manager.
   */
  attributeHook: boolean;

  /**
   * Whether to call the `didCreateElement` hook on the component manager.
   */
  elementHook: boolean;

  /**
   * Whether the component manager has an update hook.
   */
  updateHook: boolean;

  /**
   * Whether the component needs an additional dynamic scope frame.
   */
  dynamicScope: boolean;

  /**
   * Whether there is a component instance to create. If this is false,
   * the component is a "template only component"
   */
  createInstance: boolean;

  /**
   * Whether or not the component has a `willDestroy` hook that should fire
   * prior to the component being removed from the DOM.
   */
  willDestroy: boolean;
}

////////////

export interface InternalComponentManager<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown
> {
  getCapabilities(state: ComponentDefinitionState): InternalComponentCapabilities;
  getSelf(state: ComponentInstanceState): Reference;
  getDestroyable(state: ComponentInstanceState): Option<Destroyable>;
  getDebugName(state: ComponentDefinitionState): string;
}

interface CustomRenderNode extends RenderNode {
  bucket: object;
}

export interface WithCustomDebugRenderTree<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown
> extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  // APIs for hooking into the debug render tree, used by components that
  // represent multiple logical components. Specifically, {{mount}} and {{outlet}}
  getDebugCustomRenderTree(
    definition: ComponentDefinitionState,
    state: ComponentInstanceState,
    args: CapturedArguments,
    template?: Template
  ): CustomRenderNode[];
}

export interface WithPrepareArgs<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown
> extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
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
> extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
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
  extends InternalComponentManager<ComponentInstanceState> {
  // When the component's tag has invalidated, the manager's `update` hook is
  // called.
  update(state: ComponentInstanceState, dynamicScope: Option<DynamicScope>): void;
}

export interface WithStaticLayout<I = ComponentInstanceState, D = ComponentDefinitionState>
  extends InternalComponentManager<I, D> {
  getStaticLayout(state: D): Template;
}

export interface WithDynamicLayout<
  I = ComponentInstanceState,
  R extends RuntimeResolver = RuntimeResolver
> extends InternalComponentManager<I> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getDynamicLayout(component: I, resolver: R): Template;
}

export interface WithDynamicTagName<ComponentInstanceState>
  extends InternalComponentManager<ComponentInstanceState> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: ComponentInstanceState): Option<string>;
}

export interface WithAttributeHook<ComponentInstanceState>
  extends InternalComponentManager<ComponentInstanceState> {
  didSplatAttributes(
    component: ComponentInstanceState,
    element: ComponentInstanceState,
    operations: ElementOperations
  ): void;
}

export interface WithElementHook<ComponentInstanceState>
  extends InternalComponentManager<ComponentInstanceState> {
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
