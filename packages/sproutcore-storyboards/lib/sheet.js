require('sproutcore-storyboards/state')

var get = SC.get, set = SC.set;

SC.Sheet = SC.State.extend({
  isSheet: true,

  enter: function() {
    var view = get(this, 'view');

    if (view) {
      view.appendTo(this.getPath('parentState.rootElement'));
    }
  },

  exit: function() {
    var view = get(this, 'view');

    if (view) {
      view.remove();
    }
  }
});

