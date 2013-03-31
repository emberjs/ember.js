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
    var viewCollection = view.viewHierarchyCollection();

    viewCollection.trigger('willInsertElement');
    // after createElement, the view will be in the hasElement state.
    fn.call(view);
    viewCollection.transitionTo('inDOM');
    viewCollection.trigger('didInsertElement');
  },

  renderToBufferIfNeeded: function(view, buffer) {
    view.renderToBuffer(buffer);
    return true;
  },

  empty: Ember.K,

  setElement: function(view, value) {
    if (value !== null) {
      view.transitionTo('hasElement');
    }
    return value;
  }
});
