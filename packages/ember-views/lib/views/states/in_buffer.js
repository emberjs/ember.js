require('ember-views/views/states/default');

/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set, meta = Ember.meta;

Ember.View.states.inBuffer = {
  parentState: Ember.View.states._default,

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
    Ember.deprecate("Something you did caused a view to re-render after it rendered but before it was inserted into the DOM. Because this is avoidable and the cause of significant performance issues in applications, this behavior is deprecated. If you want to use the debugger to find out what caused this, you can set ENV.RAISE_ON_DEPRECATION to true.");

    view._notifyWillRerender();

    view.clearRenderedChildren();
    view.renderToBuffer(view.buffer, 'replaceWith');
  },

  // when a view is rendered in a buffer, appending a child
  // view will render that view and append the resulting
  // buffer into its buffer.
  appendChild: function(view, childView, options) {
    var buffer = view.buffer;

    childView = this.createChildView(childView, options);
    view._childViews.push(childView);

    childView.renderToBuffer(buffer);

    view.propertyDidChange('childViews');

    return childView;
  },

  // when a view is rendered in a buffer, destroying the
  // element will simply destroy the buffer and put the
  // state back into the preRender state.
  destroyElement: function(view) {
    view.clearBuffer();
    view._notifyWillDestroyElement();
    view.transitionTo('preRender');

    return view;
  },

  empty: function() {
    Ember.assert("Emptying a view in the inBuffer state is not allowed and should not happen under normal circumstances. Most likely there is a bug in your application. This may be due to excessive property change notifications.");
  },

  renderToBufferIfNeeded: function (view) {
    return view.buffer;
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
  }
};

