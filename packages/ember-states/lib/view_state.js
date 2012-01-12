require('ember-states/state');

var get = Ember.get, set = Ember.set;

Ember.ViewState = Ember.State.extend({
  isViewState: true,

  enter: function(stateManager) {
    var state;
    var view = get(this, 'view');
    var appendView = function(view, stateManager) {
      view.appendTo(stateManager.get('rootElement') || 'body');
    };

    
    if (view) {
      
      if (Ember.$.isReady === YES) {
        appendView(view, stateManager);
      } else {
        state = this;
        Ember.$(document).ready(function() {
          appendView(view, stateManager);
        });
      }
      
    }
  },

  exit: function(stateManager) {
    var view = get(this, 'view');

    if (view) {
      view.remove();
    }
  }
});

