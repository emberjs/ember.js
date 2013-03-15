/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;

// Original class declaration and documentation in runtime/lib/controllers/controller.js
// NOTE: It may be possible with YUIDoc to combine docs in two locations

/**
Additional methods for the ControllerMixin

@class ControllerMixin
@namespace Ember
*/
Ember.ControllerMixin.reopen({
  target: null,
  namespace: null,
  view: null,
  container: null,
  _childContainers: null,

  init: function() {
    this._super();
    set(this, '_childContainers', {});
  },

  _modelDidChange: Ember.observer(function() {
    var containers = get(this, '_childContainers');

    for (var prop in containers) {
      if (!containers.hasOwnProperty(prop)) { continue; }
      containers[prop].destroy();
    }

    set(this, '_childContainers', {});
  }, 'model')
});
