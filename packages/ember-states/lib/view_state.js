require('ember-states/state');

var get = Ember.get, set = Ember.set;

Ember.ViewState = Ember.State.extend({
  isViewState: true,

  enter: function(stateManager) {
    var view = get(this, 'view');

    if (view) {
      view.appendTo(stateManager.get('rootElement') || 'body');
    }
  },

  exit: function(stateManager) {
    var view = get(this, 'view');

    if (view) {
      view.remove();
    }
  }
});

