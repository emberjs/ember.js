import { forEach } from "ember-metal/enumerable_utils";

function ViewCollection(initialViews) {
  var views = this.views = initialViews || [];
  this.length = views.length;
}

ViewCollection.prototype = {
  length: 0,

  trigger: function(eventName) {
    var views = this.views, view;
    for (var i = 0, l = views.length; i < l; i++) {
      view = views[i];
      if (view.trigger) { view.trigger(eventName); }
    }
  },

  triggerRecursively: function(eventName) {
    var views = this.views;
    for (var i = 0, l = views.length; i < l; i++) {
      views[i].triggerRecursively(eventName);
    }
  },

  invokeRecursively: function(fn) {
    var views = this.views, view;

    for (var i = 0, l = views.length; i < l; i++) {
      view = views[i];
      fn(view);
    }
  },

  transitionTo: function(state, children) {
    var views = this.views;
    for (var i = 0, l = views.length; i < l; i++) {
      views[i].transitionTo(state, children);
    }
  },

  push: function() {
    this.length += arguments.length;
    var views = this.views;
    return views.push.apply(views, arguments);
  },

  objectAt: function(idx) {
    return this.views[idx];
  },

  forEach: function(callback) {
    var views = this.views;
    return forEach(views, callback);
  },

  clear: function() {
    this.length = 0;
    this.views.length = 0;
  }
};

export default ViewCollection;
