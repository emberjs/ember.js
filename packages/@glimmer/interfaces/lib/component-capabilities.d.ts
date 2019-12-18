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
export default interface ComponentCapabilities {
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
