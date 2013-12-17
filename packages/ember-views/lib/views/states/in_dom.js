require('ember-views/views/states/default');
require('ember-views/views/states/has_element');

/**
@module ember
@submodule ember-views
*/

var hasElement = Ember.View.states.hasElement;
var inDOM = Ember.View.states.inDOM = Ember.create(hasElement);

Ember.merge(inDOM, {
  enter: function(view) {
    // Register the view for event handling. This hash is used by
    // Ember.EventDispatcher to dispatch incoming events.
    if (!view.isVirtual) {
      Ember.assert("Attempted to register a view with an id already in use: "+view.elementId, !Ember.View.views[view.elementId]);
      Ember.View.views[view.elementId] = view;
    }

    view.addBeforeObserver('elementId', function() {
      throw new Ember.Error("Changing a view's elementId after creation is not allowed");
    });
  },

  exit: function(view) {
    if (!this.isVirtual) delete Ember.View.views[view.elementId];
  },

  insertElement: function(view, fn) {
    throw "You can't insert an element into the DOM that has already been inserted";
  }
});
