require('ember-views/views/states/default');

/**
@module ember
@submodule ember-views
*/

var preRender = Ember.View.states.preRender = Ember.create(Ember.View.states._default);

Ember.merge(preRender, {
  // a view leaves the preRender state once its element has been
  // created (createElement).
  insertElement: function(view, fn) {
    view.createElement();
    view._notifyWillInsertElement();
    // after createElement, the view will be in the hasElement state.
    fn.call(view);
    view.transitionTo('inDOM');
    view._notifyDidInsertElement();
  },

  renderToBufferIfNeeded: function(view) {
    return view.renderToBuffer();
  },

  empty: Ember.K,

  setElement: function(view, value) {
    if (value !== null) {
      view.transitionTo('hasElement');
    }
    return value;
  }
});
