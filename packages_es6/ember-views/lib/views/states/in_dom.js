import hasElement from "ember-views/views/states/has_element";
import EmberError from "ember-metal/error";

import Ember from "ember-metal/core"; // Ember.merge, Ember.create, Ember.$, Ember.assert
var create = Ember.create, merge = Ember.merge;
/**
@module ember
@submodule ember-views
*/

var inDOM = create(hasElement);

merge(inDOM, {
  enter: function(view) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    if (!view.isVirtual) {
      Ember.assert("Attempted to register a view with an id already in use: "+view.elementId, !Ember.View.views[view.elementId]);
      Ember.View.views[view.elementId] = view;
    }

    view.addBeforeObserver('elementId', function() {
      throw new EmberError("Changing a view's elementId after creation is not allowed");
    });
  },

  exit: function(view) {
    if (!this.isVirtual) delete Ember.View.views[view.elementId];
  },

  insertElement: function(view, fn) {
    throw "You can't insert an element into the DOM that has already been inserted";
  }
});
