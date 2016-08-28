/**
@module ember
@submodule ember-views
*/

// BEGIN IMPORTS
import Ember from 'ember-runtime';
import jQuery from 'ember-views/system/jquery';
import {
  isSimpleClick,
  getViewClientRects,
  getViewBoundingClientRect,
  getRootViews,
  getChildViews
} from 'ember-views/system/utils';
import 'ember-views/system/ext';  // for the side effect of extending Ember.run.queues

import EventDispatcher from 'ember-views/system/event_dispatcher';
import ViewTargetActionSupport from 'ember-views/mixins/view_target_action_support';
import ComponentLookup from 'ember-views/component_lookup';
import TextSupport from 'ember-views/mixins/text_support';

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
ViewUtils.getViewClientRects = getViewClientRects;
ViewUtils.getViewBoundingClientRect = getViewBoundingClientRect;
ViewUtils.getRootViews = getRootViews;
ViewUtils.getChildViews = getChildViews;

Ember.TextSupport = TextSupport;
Ember.ComponentLookup = ComponentLookup;
Ember.EventDispatcher = EventDispatcher;

// END EXPORTS

export default Ember;
