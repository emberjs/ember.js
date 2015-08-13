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
import {
  cloneStates,
  states
} from 'ember-views/views/states';

import Renderer from 'ember-metal-views/renderer';
import { DeprecatedCoreView } from 'ember-views/views/core_view';
import { DeprecatedView } from 'ember-views/views/view';
import { DeprecatedContainerView } from 'ember-views/views/container_view';
import CollectionView from 'ember-views/views/collection_view';
import Component from 'ember-views/components/component';

import EventDispatcher from 'ember-views/system/event_dispatcher';
import ViewTargetActionSupport from 'ember-views/mixins/view_target_action_support';
import ComponentLookup from 'ember-views/component_lookup';
import Checkbox from 'ember-views/views/checkbox';
import TextSupport from 'ember-views/mixins/text_support';
import TextField from 'ember-views/views/text_field';
import TextArea from 'ember-views/views/text_area';

import {
  Select,
  SelectOption,
  SelectOptgroup
} from 'ember-views/views/select';
import _MetamorphView, { _Metamorph } from 'ember-views/compat/metamorph_view';
import LegacyEachView from 'ember-views/views/legacy_each_view';

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

if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  Ember.CoreView = DeprecatedCoreView;
  Ember.View = DeprecatedView;
  Ember.View.states = states;
  Ember.View.cloneStates = cloneStates;
  Ember.View._Renderer = Renderer;
  Ember.ContainerView = DeprecatedContainerView;
  Ember.CollectionView = CollectionView;
}

Ember._Renderer = Renderer;

Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;

if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  Ember.Select = Select;
}

Ember.SelectOption = SelectOption;
Ember.SelectOptgroup = SelectOptgroup;

Ember.TextSupport = TextSupport;
Ember.ComponentLookup = ComponentLookup;
Ember.Component = Component;
Ember.EventDispatcher = EventDispatcher;

// Deprecated:
if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  Ember._Metamorph = _Metamorph;
  Ember._MetamorphView = _MetamorphView;
  Ember._LegacyEachView = LegacyEachView;
}

// END EXPORTS

export default Ember;
