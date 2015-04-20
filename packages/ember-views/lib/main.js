/**
Ember Views

@module ember
@submodule ember-views
@requires ember-runtime
@main ember-views
*/

// BEGIN IMPORTS
import Ember from "ember-runtime";
import jQuery from "ember-views/system/jquery";
import {
  isSimpleClick,
  getViewClientRects,
  getViewBoundingClientRect
} from "ember-views/system/utils";
import RenderBuffer from "ember-views/system/render_buffer";
import "ember-views/system/ext";  // for the side effect of extending Ember.run.queues
import {
  cloneStates,
  states
} from "ember-views/views/states";

import Renderer from 'ember-metal-views/renderer';
import { DeprecatedCoreView } from "ember-views/views/core_view";
import View from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";
import CollectionView from "ember-views/views/collection_view";
import Component from "ember-views/views/component";

import EventDispatcher from "ember-views/system/event_dispatcher";
import ViewTargetActionSupport from "ember-views/mixins/view_target_action_support";
import ComponentLookup from "ember-views/component_lookup";
import Checkbox from "ember-views/views/checkbox";
import TextSupport from "ember-views/mixins/text_support";
import TextField from "ember-views/views/text_field";
import TextArea from "ember-views/views/text_area";

import {
  Select,
  SelectOption,
  SelectOptgroup
} from "ember-views/views/select";
import "ember-views/initializers/components";
// END IMPORTS

/**
  Alias for jQuery

  @method $
  @for Ember
*/

// BEGIN EXPORTS
Ember.$ = jQuery;

Ember.ViewTargetActionSupport = ViewTargetActionSupport;
Ember.RenderBuffer = RenderBuffer;

var ViewUtils = Ember.ViewUtils = {};
ViewUtils.isSimpleClick = isSimpleClick;
ViewUtils.getViewClientRects = getViewClientRects;
ViewUtils.getViewBoundingClientRect = getViewBoundingClientRect;

Ember.CoreView = DeprecatedCoreView;
Ember.View = View;
Ember.View.states = states;
Ember.View.cloneStates = cloneStates;
Ember.View._Renderer = Renderer;
Ember.Checkbox = Checkbox;
Ember.TextField = TextField;
Ember.TextArea = TextArea;

Ember.Select = Select;
Ember.SelectOption = SelectOption;
Ember.SelectOptgroup = SelectOptgroup;

Ember.TextSupport = TextSupport;
Ember.ComponentLookup = ComponentLookup;
Ember.ContainerView = ContainerView;
Ember.CollectionView = CollectionView;
Ember.Component = Component;
Ember.EventDispatcher = EventDispatcher;
// END EXPORTS

export default Ember;
