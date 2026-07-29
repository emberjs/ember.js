/*
  The modern replacement for this package's barrel, swapped in at the build
  level for variants without classic components. The DOM/view-registry utils
  stay (the renderer and LinkTo use them, and @ember/test-helpers imports
  from this barrel); the classic view classes (CoreView, ActionSupport,
  ViewStates, MUTABLE_CELL) are gone, and EventDispatcher resolves to its
  no-op modern replacement.
*/
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
} from './lib/system/utils';
export { default as EventDispatcher } from './lib/system/event_dispatcher_modern';
