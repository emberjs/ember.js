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
  isSimpleClick
} from "ember-views/system/utils";
import RenderBuffer from "ember-views/system/render_buffer";
import "ember-views/system/ext";  // for the side effect of extending Ember.run.queues
import {
  cloneStates,
  states
} from "ember-views/views/states";

import  CoreView from "ember-views/views/core_view";
import  View from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";
import CollectionView from "ember-views/views/collection_view";
import Component from "ember-views/views/component";

import EventDispatcher from "ember-views/system/event_dispatcher";
import ViewTargetActionSupport from "ember-views/mixins/view_target_action_support";
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

Ember.CoreView = CoreView;
Ember.View = View;
Ember.View.states = states;
Ember.View.cloneStates = cloneStates;

Ember.ContainerView = ContainerView;
Ember.CollectionView = CollectionView;
Ember.Component = Component;
Ember.EventDispatcher = EventDispatcher;
// END EXPORTS

export default Ember;
