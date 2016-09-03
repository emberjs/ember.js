/**
@module ember
@submodule ember-views
*/

export { default as jQuery } from './system/jquery';
export {
  isSimpleClick,
  getViewBounds,
  getViewClientRects,
  getViewBoundingClientRect,
  getRootViews,
  getChildViews
} from './system/utils';
export { default as EventDispatcher } from './system/event_dispatcher';
export { default as ComponentLookup } from './component_lookup';
export { default as TextSupport } from './mixins/text_support';

import './system/ext';  // for the side effect of extending Ember.run.queues
