declare module '@ember/-internals/views' {
  export {
    addChildView,
    isSimpleClick,
    getViewBounds,
    getViewClientRects,
    getViewBoundingClientRect,
    getRootViews,
    getChildViews,
    getViewId,
    getElementView,
    getViewElement,
    setElementView,
    setViewElement,
    clearElementView,
    clearViewElement,
    constructStyleDeprecationMessage,
  } from '@ember/-internals/views/lib/system/utils';
  export { default as EventDispatcher } from '@ember/-internals/views/lib/system/event_dispatcher';
  export { default as ComponentLookup } from '@ember/-internals/views/lib/component_lookup';
  export { default as CoreView } from '@ember/-internals/views/lib/views/core_view';
  export { default as ClassNamesSupport } from '@ember/-internals/views/lib/mixins/class_names_support';
  export { default as ChildViewsSupport } from '@ember/-internals/views/lib/mixins/child_views_support';
  export { default as ViewStateSupport } from '@ember/-internals/views/lib/mixins/view_state_support';
  export { default as ViewMixin } from '@ember/-internals/views/lib/mixins/view_support';
  export { default as ActionSupport } from '@ember/-internals/views/lib/mixins/action_support';
  export { MUTABLE_CELL } from '@ember/-internals/views/lib/compat/attrs';
  export { default as ActionManager } from '@ember/-internals/views/lib/system/action_manager';
}
