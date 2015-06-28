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

import ViewTargetActionSupport from 'ember-views/mixins/view_target_action_support';

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

var reexport = Ember.__reexport;

if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  reexport('ember-views/views/core_view', [['DeprecatedCoreView', 'CoreView']]);
  reexport('ember-views/views/view', [['DeprecatedView', 'View']]);
  reexport('ember-views/views/states', 'Ember.View', ['states', 'cloneStates']);
  reexport('ember-metal-views/renderer', 'Ember.View', [['default', '_Renderer']]);
  reexport('ember-views/views/container_view', 'ContainerView');
  reexport('ember-views/views/collection_view', 'CollectionView');
}

reexport('ember-views/views/checkbox', 'Checkbox');
reexport('ember-views/views/text_field', 'TextField');
reexport('ember-views/views/text_area', 'TextArea');

if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  reexport('ember-views/views/select', 'Select');
}

reexport('ember-views/views/select', [
  'SelectOption',
  'SelectOptgroup'
]);

reexport('ember-views/mixins/text_support', 'TextSupport');
reexport('ember-views/component_lookup', 'ComponentLookup');
reexport('ember-views/views/component', 'Component');
reexport('ember-views/system/event_dispatcher', 'EventDispatcher');

// Deprecated:
if (Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  Ember._Metamorph = _Metamorph;
  Ember._MetamorphView = _MetamorphView;
  Ember._LegacyEachView = LegacyEachView;
}

// END EXPORTS

export default Ember;
