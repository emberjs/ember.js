require('ember-views/views/view');
require('ember-views/views/states');

var states = Ember.View.cloneStates(Ember.View.states);

/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set, meta = Ember.meta;
var forEach = Ember.EnumerableUtils.forEach;

var childViewsProperty = Ember.computed(function() {
  return get(this, '_childViews');
}).property('_childViews');

/**
  A `ContainerView` is an `Ember.View` subclass that allows for manual or
  programatic management of a view's `childViews` array that will correctly
  update the `ContainerView` instance's rendered DOM representation.

  ## Setting Initial Child Views

  The initial array of child views can be set in one of two ways. You can
  provide a `childViews` property at creation time that contains instance of
  `Ember.View`:

  ```javascript
  aContainer = Ember.ContainerView.create({
    childViews: [Ember.View.create(), Ember.View.create()]
  });
  ```

  You can also provide a list of property names whose values are instances of
  `Ember.View`:

  ```javascript
  aContainer = Ember.ContainerView.create({
    childViews: ['aView', 'bView', 'cView'],
    aView: Ember.View.create(),
    bView: Ember.View.create(),
    cView: Ember.View.create()
  });
  ```

  The two strategies can be combined:

  ```javascript
  aContainer = Ember.ContainerView.create({
    childViews: ['aView', Ember.View.create()],
    aView: Ember.View.create()
  });
  ```

  Each child view's rendering will be inserted into the container's rendered
  HTML in the same order as its position in the `childViews` property.

  ## Adding and Removing Child Views

  The views in a container's `childViews` array should be added and removed by
  manipulating the `childViews` property directly.

  To remove a view pass that view into a `removeObject` call on the container's
  `childViews` property.

  Given an empty `<body>` the following code

  ```javascript
  aContainer = Ember.ContainerView.create({
    classNames: ['the-container'],
    childViews: ['aView', 'bView'],
    aView: Ember.View.create({
      template: Ember.Handlebars.compile("A")
    }),
    bView: Ember.View.create({
      template: Ember.Handlebars.compile("B")
    })
  });

  aContainer.appendTo('body');
  ```

  Results in the HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
  </div>
  ```

  Removing a view

  ```javascript
  aContainer.get('childViews');  // [aContainer.aView, aContainer.bView]
  aContainer.get('childViews').removeObject(aContainer.get('bView'));
  aContainer.get('childViews');  // [aContainer.aView]
  ```

  Will result in the following HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
  </div>
  ```

  Similarly, adding a child view is accomplished by adding `Ember.View` instances to the
  container's `childViews` property.

  Given an empty `<body>` the following code

  ```javascript
  aContainer = Ember.ContainerView.create({
    classNames: ['the-container'],
    childViews: ['aView', 'bView'],
    aView: Ember.View.create({
      template: Ember.Handlebars.compile("A")
    }),
    bView: Ember.View.create({
      template: Ember.Handlebars.compile("B")
    })
  });

  aContainer.appendTo('body');
  ```

  Results in the HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
  </div>
  ```

  Adding a view

  ```javascript
  AnotherViewClass = Ember.View.extend({
    template: Ember.Handlebars.compile("Another view")
  });

  aContainer.get('childViews');  // [aContainer.aView, aContainer.bView]
  aContainer.get('childViews').pushObject(AnotherViewClass.create());
  aContainer.get('childViews');  // [aContainer.aView, aContainer.bView, <AnotherViewClass instance>]
  ```

  Will result in the following HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
    <div class="ember-view">Another view</div>
  </div>
  ```

  Direct manipulation of `childViews` presence or absence in the DOM via calls
  to `remove` or `removeFromParent` or calls to a container's `removeChild` may
  not behave correctly.

  Calling `remove()` on a child view will remove the view's HTML, but it will
  remain as part of its container's `childView`s property.

  Calling `removeChild()` on the container will remove the passed view instance
  from the container's `childView`s but keep its HTML within the container's
  rendered view.

  Calling `removeFromParent()` behaves as expected but should be avoided in
  favor of direct manipulation of a container's `childViews` property.

  ```javascript
  aContainer = Ember.ContainerView.create({
    classNames: ['the-container'],
    childViews: ['aView', 'bView'],
    aView: Ember.View.create({
      template: Ember.Handlebars.compile("A")
    }),
    bView: Ember.View.create({
      template: Ember.Handlebars.compile("B")
    })
  });

  aContainer.appendTo('body');
  ```

  Results in the HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
  </div>
  ```

  Calling `aContainer.get('aView').removeFromParent()` will result in the
  following HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">B</div>
  </div>
  ```

  And the `Ember.View` instance stored in `aContainer.aView` will be removed from `aContainer`'s
  `childViews` array.

  ## Templates and Layout

  A `template`, `templateName`, `defaultTemplate`, `layout`, `layoutName` or
  `defaultLayout` property on a container view will not result in the template
  or layout being rendered. The HTML contents of a `Ember.ContainerView`'s DOM
  representation will only be the rendered HTML of its child views.

  ## Binding a View to Display

  If you would like to display a single view in your ContainerView, you can set
  its `currentView` property. When the `currentView` property is set to a view
  instance, it will be added to the ContainerView's `childViews` array. If the
  `currentView` property is later changed to a different view, the new view
  will replace the old view. If `currentView` is set to `null`, the last
  `currentView` will be removed.

  This functionality is useful for cases where you want to bind the display of
  a ContainerView to a controller or state manager. For example, you can bind
  the `currentView` of a container to a controller like this:

  ```javascript
  App.appController = Ember.Object.create({
    view: Ember.View.create({
      templateName: 'person_template'
    })
  });
  ```

  ```handlebars
  {{view Ember.ContainerView currentViewBinding="App.appController.view"}}
  ```

  @class ContainerView
  @namespace Ember
  @extends Ember.View
*/

Ember.ContainerView = Ember.View.extend({
  states: states,

  init: function() {
    this._super();

    var childViews = get(this, 'childViews');
    Ember.defineProperty(this, 'childViews', childViewsProperty);

    var _childViews = this._childViews;

    forEach(childViews, function(viewName, idx) {
      var view;

      if ('string' === typeof viewName) {
        view = get(this, viewName);
        view = this.createChildView(view);
        set(this, viewName, view);
      } else {
        view = this.createChildView(viewName);
      }

      _childViews[idx] = view;
    }, this);

    var currentView = get(this, 'currentView');
    if (currentView) _childViews.push(this.createChildView(currentView));

    // Make the _childViews array observable
    Ember.A(_childViews);

    // Sets up an array observer on the child views array. This
    // observer will detect when child views are added or removed
    // and update the DOM to reflect the mutation.
    get(this, 'childViews').addArrayObserver(this, {
      willChange: 'childViewsWillChange',
      didChange: 'childViewsDidChange'
    });
  },

  /**
    @private

    Instructs each child view to render to the passed render buffer.

    @method render
    @param {Ember.RenderBuffer} buffer the buffer to render to
  */
  render: function(buffer) {
    this.forEachChildView(function(view) {
      view.renderToBuffer(buffer);
    });
  },

  instrumentName: 'render.container',

  /**
    @private

    When the container view is destroyed, tear down the child views
    array observer.

    @method willDestroy
  */
  willDestroy: function() {
    get(this, 'childViews').removeArrayObserver(this, {
      willChange: 'childViewsWillChange',
      didChange: 'childViewsDidChange'
    });

    this._super();
  },

  /**
    @private

    When a child view is removed, destroy its element so that
    it is removed from the DOM.

    The array observer that triggers this action is set up in the
    `renderToBuffer` method.

    @method childViewsWillChange
    @param {Ember.Array} views the child views array before mutation
    @param {Number} start the start position of the mutation
    @param {Number} removed the number of child views removed
  **/
  childViewsWillChange: function(views, start, removed) {
    if (removed === 0) { return; }

    var changedViews = views.slice(start, start+removed);
    this.initializeViews(changedViews, null, null);

    this.currentState.childViewsWillChange(this, views, start, removed);
  },

  /**
    @private

    When a child view is added, make sure the DOM gets updated appropriately.

    If the view has already rendered an element, we tell the child view to
    create an element and insert it into the DOM. If the enclosing container
    view has already written to a buffer, but not yet converted that buffer
    into an element, we insert the string representation of the child into the
    appropriate place in the buffer.

    @method childViewsDidChange
    @param {Ember.Array} views the array of child views afte the mutation has occurred
    @param {Number} start the start position of the mutation
    @param {Number} removed the number of child views removed
    @param {Number} the number of child views added
  */
  childViewsDidChange: function(views, start, removed, added) {
    var len = get(views, 'length');

    // No new child views were added; bail out.
    if (added === 0) return;

    var changedViews = views.slice(start, start+added);
    this.initializeViews(changedViews, this, get(this, 'templateData'));

    // Let the current state handle the changes
    this.currentState.childViewsDidChange(this, views, start, added);
  },

  initializeViews: function(views, parentView, templateData) {
    forEach(views, function(view) {
      set(view, '_parentView', parentView);

      if (!get(view, 'templateData')) {
        set(view, 'templateData', templateData);
      }
    });
  },

  currentView: null,

  _currentViewWillChange: Ember.beforeObserver(function() {
    var childViews = get(this, 'childViews'),
        currentView = get(this, 'currentView');

    if (currentView) {
      currentView.destroy();
      childViews.removeObject(currentView);
    }
  }, 'currentView'),

  _currentViewDidChange: Ember.observer(function() {
    var childViews = get(this, 'childViews'),
        currentView = get(this, 'currentView');

    if (currentView) {
      childViews.pushObject(currentView);
    }
  }, 'currentView'),

  _ensureChildrenAreInDOM: function () {
    this.currentState.ensureChildrenAreInDOM(this);
  }
});

Ember.merge(states._default, {
  childViewsWillChange: Ember.K,
  childViewsDidChange: Ember.K,
  ensureChildrenAreInDOM: Ember.K
});

Ember.merge(states.inBuffer, {
  childViewsDidChange: function(parentView, views, start, added) {
    throw new Error('You cannot modify child views while in the inBuffer state');
  }
});

Ember.merge(states.hasElement, {
  childViewsWillChange: function(view, views, start, removed) {
    for (var i=start; i<start+removed; i++) {
      views[i].remove();
    }
  },

  childViewsDidChange: function(view, views, start, added) {
    Ember.run.scheduleOnce('render', view, '_ensureChildrenAreInDOM');
  },

  ensureChildrenAreInDOM: function(view) {
    var childViews = view.get('childViews'), i, len, childView, previous, buffer;
    for (i = 0, len = childViews.length; i < len; i++) {
      childView = childViews[i];
      buffer = childView.renderToBufferIfNeeded();
      if (buffer) {
        childView.triggerRecursively('willInsertElement');
        if (previous) {
          previous.domManager.after(previous, buffer.string());
        } else {
          view.domManager.prepend(view, buffer.string());
        }
        childView.transitionTo('inDOM');
        childView.propertyDidChange('element');
        childView.triggerRecursively('didInsertElement');
      }
      previous = childView;
    }
  }
});
