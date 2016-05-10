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
  getViewBoundingClientRect
} from 'ember-views/system/utils';
import 'ember-views/system/ext';  // for the side effect of extending Ember.run.queues

import { Renderer } from 'ember-htmlbars/renderer';
import Component from 'ember-views/components/component';

import EventDispatcher from 'ember-views/system/event_dispatcher';
import ViewTargetActionSupport from 'ember-views/mixins/view_target_action_support';
import ComponentLookup from 'ember-views/component_lookup';
import Checkbox from 'ember-views/views/checkbox';
import TextSupport from 'ember-views/mixins/text_support';
import TextField from 'ember-views/views/text_field';
import TextArea from 'ember-views/views/text_area';

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

var ViewUtils = Ember.ViewUtils = {};
ViewUtils.isSimpleClick = isSimpleClick;
ViewUtils.getViewClientRects = getViewClientRects;
ViewUtils.getViewBoundingClientRect = getViewBoundingClientRect;

Ember._Renderer = Renderer;

Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;

Ember.TextSupport = TextSupport;
Ember.ComponentLookup = ComponentLookup;
Ember.Component = Component;
Ember.EventDispatcher = EventDispatcher;

// END EXPORTS

export default Ember;
