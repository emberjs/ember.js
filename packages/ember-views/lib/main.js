/**
@module ember
@submodule ember-views
*/

// BEGIN IMPORTS
import Ember from 'ember-runtime';

// END IMPORTS

var reexport = Ember.__reexport;
/**
  Alias for jQuery

  @method $
  @for Ember
 @public
*/
reexport('ember-views/system/jquery', '$');

reexport('ember-views/mixins/view_target_action_support', 'ViewTargetActionSupport');
reexport('ember-views/compat/render_buffer', 'RenderBuffer');

reexport('ember-views/system/utils', [
  'isSimpleClick',
  'getViewClientRects',
  'getViewBoundingClientRect'
]);
Ember.ViewUtils = {};

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
  reexport('ember-views/compat/metamorph_view', [
    ['default', '_MetamorphView'],
    '_Metamorph'
  ]);
}

reexport('ember-views/views/legacy_each_view', ['LegacyEachView', '_LegacyEachView']);

export default Ember;
