require('sproutcore-states/state')

var get = SC.get, set = SC.set;

SC.ViewState = SC.State.extend({
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

