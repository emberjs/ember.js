require('ember-views/views/states/default');

/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;

var inBuffer = Ember.View.states.inBuffer = Ember.create(Ember.View.states._default);

Ember.merge(inBuffer, {
  $: function(view, sel) {
    // if we don't have an element yet, someone calling this.$() is
    // trying to update an element that isn't in the DOM. Instead,
    // rerender the view to allow the render method to reflect the
    // changes.
    view.rerender();
    return Ember.$();
  },

  // when a view is rendered in a buffer, rerendering it simply
  // replaces the existing buffer with a new one
  rerender: function(view) {
    throw new Ember.Error("Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.");
  },

  // when a view is rendered in a buffer, appending a child
  // view will render that view and append the resulting
  // buffer into its buffer.
  appendChild: function(view, childView, options) {
    var buffer = view.buffer, _childViews = view._childViews;

    childView = view.createChildView(childView, options);
    if (!_childViews.length) { _childViews = view._childViews = _childViews.slice(); }
    _childViews.push(childView);

    childView.renderToBuffer(buffer);

    view.propertyDidChange('childViews');

    return childView;
  },

  // when a view is rendered in a buffer, destroying the
  // element will simply destroy the buffer and put the
  // state back into the preRender state.
  destroyElement: function(view) {
    view.clearBuffer();
    var viewCollection = view._notifyWillDestroyElement();
    viewCollection.transitionTo('preRender', false);

    return view;
  },

  empty: function() {
    Ember.assert("Emptying a view in the inBuffer state is not allowed and " +
                 "should not happen under normal circumstances. Most likely " +
                 "there is a bug in your application. This may be due to " +
                 "excessive property change notifications.");
  },

  renderToBufferIfNeeded: function (view, buffer) {
    return false;
  },

  // It should be impossible for a rendered view to be scheduled for
  // insertion.
  insertElement: function() {
    throw "You can't insert an element that has already been rendered";
  },

  setElement: function(view, value) {
    if (value === null) {
      view.transitionTo('preRender');
    } else {
      view.clearBuffer();
      view.transitionTo('hasElement');
    }

    return value;
  },

  invokeObserver: function(target, observer) {
    observer.call(target);
  }
});

