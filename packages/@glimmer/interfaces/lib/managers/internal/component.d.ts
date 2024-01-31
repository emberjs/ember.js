import type { ComponentInstanceState, PreparedArguments } from '../../components.js';
import type { Destroyable, Nullable } from '../../core.js';
import type { Bounds } from '../../dom/bounds.js';
import type { SimpleElement } from '../../dom/simple.js';
import type { Reference } from '../../references.js';
import type { Owner } from '../../runtime.js';
import type { CapturedArguments, VMArguments } from '../../runtime/arguments.js';
import type { RenderNode } from '../../runtime/debug-render-tree.js';
import type { ElementOperations } from '../../runtime/element.js';
import type { Environment } from '../../runtime/environment.js';
import type { DynamicScope } from '../../runtime/scope.js';
import type { RuntimeResolver } from '../../serialize.js';
import type { CompilableProgram } from '../../template.js';
import type { ProgramSymbolTable } from '../../tier1/symbol-table.js';

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

  /**
   * Whether or not the component pushes an owner onto the owner stack. This is
   * used for engines.
   */
  hasSubOwner: boolean;
}

/**
 * Enum used for bit flags version of the capabilities, used once the component
 * has been loaded for the first time
 */
export type EmptyCapability = 0b0000000000000;
export type DynamicLayoutCapability = 0b0000000000001;
export type DynamicTagCapability = 0b0000000000010;
export type PrepareArgsCapability = 0b0000000000100;
export type CreateArgsCapability = 0b0000000001000;
export type AttributeHookCapability = 0b0000000010000;
export type ElementHookCapability = 0b0000000100000;
export type DynamicScopeCapability = 0b0000001000000;
export type CreateCallerCapability = 0b0000010000000;
export type UpdateHookCapability = 0b0000100000000;
export type CreateInstanceCapability = 0b0001000000000;
export type WrappedCapability = 0b0010000000000;
export type WillDestroyCapability = 0b0100000000000;
export type HasSubOwnerCapability = 0b1000000000000;

export type InternalComponentCapability =
  | EmptyCapability
  | DynamicLayoutCapability
  | DynamicTagCapability
  | PrepareArgsCapability
  | CreateArgsCapability
  | AttributeHookCapability
  | ElementHookCapability
  | DynamicScopeCapability
  | CreateCallerCapability
  | UpdateHookCapability
  | CreateInstanceCapability
  | WrappedCapability
  | WillDestroyCapability
  | HasSubOwnerCapability;

////////////

export interface InternalComponentManager<
  TComponentStateBucket = unknown,
  TComponentDefinition = object,
> {
  getCapabilities(state: TComponentDefinition): InternalComponentCapabilities;
  getSelf(state: TComponentStateBucket): Reference;
  getDestroyable(state: TComponentStateBucket): Nullable<Destroyable>;
  getDebugName(state: TComponentDefinition): string;
}

export interface CustomRenderNode extends RenderNode {
  bucket: object;
}

export interface WithCustomDebugRenderTree<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown,
> extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  // APIs for hooking into the debug render tree, used by components that
  // represent multiple logical components. Specifically, {{mount}} and {{outlet}}
  getDebugCustomRenderTree(
    definition: ComponentDefinitionState,
    state: ComponentInstanceState,
    args: CapturedArguments,
    template?: string
  ): CustomRenderNode[];
}

export interface WithPrepareArgs<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown,
> extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  // The component manager is asked to prepare the arguments needed
  // for `create`. This allows for things like closure> components where the
  // args need to be curried before constructing the instance of the state
  // bucket.
  prepareArgs(state: ComponentDefinitionState, args: VMArguments): Nullable<PreparedArguments>;
}

export interface WithSubOwner<ComponentInstanceState = unknown, ComponentDefinitionState = unknown>
  extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  getOwner(state: ComponentInstanceState): Owner;
}

export interface WithCreateInstance<
  ComponentInstanceState = unknown,
  ComponentDefinitionState = unknown,
  O extends Owner = Owner,
> extends InternalComponentManager<ComponentInstanceState, ComponentDefinitionState> {
  // The component manager is asked to create a bucket of state for
  // the supplied arguments. From the perspective of Glimmer, this is
  // an opaque token, but in practice it is probably a component object.
  create(
    owner: O,
    state: ComponentDefinitionState,
    args: Nullable<VMArguments>,
    env: Environment,
    dynamicScope: Nullable<DynamicScope>,
    caller: Nullable<Reference>,
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
  update(state: ComponentInstanceState, dynamicScope: Nullable<DynamicScope>): void;
}

export interface WithDynamicLayout<
  I = ComponentInstanceState,
  R extends RuntimeResolver = RuntimeResolver,
> extends InternalComponentManager<I> {
  // Return the compiled layout to use for this component. This is called
  // *after* the component instance has been created, because you might
  // want to return a different layout per-instance for optimization reasons
  // or to implement features like Ember's "late-bound" layouts.
  getDynamicLayout(component: I, resolver: R): CompilableProgram | null;
}

export interface WithDynamicTagName<ComponentInstanceState>
  extends InternalComponentManager<ComponentInstanceState> {
  // If the component asks for the dynamic tag name capability, ask for
  // the tag name to use. (Only used in the "WrappedBuilder".)
  getTagName(component: ComponentInstanceState): Nullable<string>;
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
