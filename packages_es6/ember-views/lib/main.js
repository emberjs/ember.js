/**
@module ember
@submodule ember-views
*/


/**
Ember Views

@module ember
@submodule ember-views
@requires ember-runtime
@main ember-views
*/

var jQuery = (Ember.imports && Ember.imports.jQuery) || (this && this.jQuery);
if (!jQuery && typeof require === 'function') {
  jQuery = require('jquery');
}

Ember.assert("Ember Views require jQuery between 1.7 and 2.1", jQuery && (jQuery().jquery.match(/^((1\.(7|8|9|10|11))|(2\.(0|1)))(\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));

/**
  Alias for jQuery

  @method $
  @for Ember
*/
Ember.$ = jQuery;


import "ember-views/system/ext";  // for the side effect of extending jQuery
import {setInnerHTML, isSimpleClick} from "ember-views/system/utils"
import RenderBuffer from "ember-views/system/render_buffer";
import "ember-views/system/ext";  // for the side effect of extending Ember.run.queues
import {states} from "ember-views/views/states";

import {CoreView, View, ViewCollection} from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";
import CollectionView from "ember-views/views/collection_view";
import Component from "ember-views/views/component_view";

import ViewTargetActionSupport from "ember-views/mixins/view_target_action_support"

View.states = states;

Ember.ViewTargetActionSupport = ViewTargetActionSupport;
Ember.RenderBuffer = RenderBuffer;

Ember.ViewUtils = {
  setInnerHTML: setInnerHTML,
  isSimpleClick: isSimpleClick
};

Ember.CoreView = CoreView;
Ember.View = View;
Ember._ViewCollection = ViewCollection;
Ember.ContainerView = ContainerView;
Ember.Component = Component;

