/**
@module ember
@submodule ember-views
*/

// BEGIN IMPORTS
import Ember from 'ember-runtime';
import jQuery from './system/jquery';
import {
  isSimpleClick,
  getViewBounds,
  getViewClientRects,
  getViewBoundingClientRect,
  getRootViews,
  getChildViews
} from './system/utils';
import './system/ext';  // for the side effect of extending Ember.run.queues

import EventDispatcher from './system/event_dispatcher';
import ViewTargetActionSupport from './mixins/view_target_action_support';
import ComponentLookup from './component_lookup';
import TextSupport from './mixins/text_support';

// END IMPORTS

/**
  Alias for jQuery

  @method $
  @for Ember
 @public
*/

// BEGIN EXPORTS
Ember.$ = jQuery;

Ember.ViewTargetActionSupport = ViewTargetActionSupport;

const ViewUtils = Ember.ViewUtils = {};
ViewUtils.isSimpleClick = isSimpleClick;
ViewUtils.getViewBounds = getViewBounds;
ViewUtils.getViewClientRects = getViewClientRects;
ViewUtils.getViewBoundingClientRect = getViewBoundingClientRect;
ViewUtils.getRootViews = getRootViews;
ViewUtils.getChildViews = getChildViews;

Ember.TextSupport = TextSupport;
Ember.ComponentLookup = ComponentLookup;
Ember.EventDispatcher = EventDispatcher;

// END EXPORTS

export default Ember;
