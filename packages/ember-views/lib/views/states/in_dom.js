import Ember from "ember-metal/core"; // Ember.assert
import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";
import EmberError from "ember-metal/error";

import hasElement from "ember-views/views/states/has_element";
/**
@module ember
@submodule ember-views
*/

var inDOM = create(hasElement);

var View;

merge(inDOM, {
  enter: function(view) {
    if (!View) { View = requireModule('ember-views/views/view')["default"]; } // ES6TODO: this sucks. Have to avoid cycles...

    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    if (!view.isVirtual) {
      Ember.assert("Attempted to register a view with an id already in use: "+view.elementId, !View.views[view.elementId]);
      View.views[view.elementId] = view;
    }

    view.addBeforeObserver('elementId', function() {
      throw new EmberError("Changing a view's elementId after creation is not allowed");
    });
  },

  exit: function(view) {
    if (!View) { View = requireModule('ember-views/views/view')["default"]; } // ES6TODO: this sucks. Have to avoid cycles...

    if (!this.isVirtual) delete View.views[view.elementId];
  }
});

export default inDOM;
