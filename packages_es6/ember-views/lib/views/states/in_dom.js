import Ember from "ember-metal/core"; // Ember.merge, Ember.create, Ember.$, Ember.assert
import {create} from "ember-metal/platform";
import EmberError from "ember-metal/error";

import hasElement from "ember-views/views/states/has_element";

var merge = Ember.merge;
/**
@module ember
@submodule ember-views
*/

var inDOM = create(hasElement);

var View;

merge(inDOM, {
  enter: function(view) {
    if (!View) { View = requireModule('ember-views/views/view')["View"]; } // ES6TODO: this sucks. Have to avoid cycles...

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
    if (!View) { View = requireModule('ember-views/views/view')["View"]; } // ES6TODO: this sucks. Have to avoid cycles...

    if (!this.isVirtual) delete View.views[view.elementId];
  },

  insertElement: function(view, fn) {
    throw "You can't insert an element into the DOM that has already been inserted";
  }
});

export default inDOM;
