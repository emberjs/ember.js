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
    view.triggerRecursively('willInsertElement');
    // after createElement, the view will be in the hasElement state.

    if (view.get('hasMoveEvents')) {
      var dispatcher = view.get('eventDispatcher');
      if (dispatcher) dispatcher.registerViewForMoveEvents(view);

      view.set('registeredForMoveEvents', true);
    }

    fn.call(view);
    view.transitionTo('inDOM');
    view.triggerRecursively('didInsertElement');
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
