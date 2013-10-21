require('ember-views/views/view');
require('ember-views/views/states');
require('ember-runtime/mixins/mutable_array');

var states = Ember.View.cloneStates(Ember.View.states);

/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;
var ViewCollection = Ember._ViewCollection;

/**
  A `ContainerView` is an `Ember.View` subclass that implements `Ember.MutableArray`
  allowing programatic management of its child views.

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

  The container view implements `Ember.MutableArray` allowing programatic management of its child views.

  To remove a view, pass that view into a `removeObject` call on the container view.

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
  aContainer.toArray();  // [aContainer.aView, aContainer.bView]
  aContainer.removeObject(aContainer.get('bView'));
  aContainer.toArray();  // [aContainer.aView]
  ```

  Will result in the following HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
  </div>
  ```

  Similarly, adding a child view is accomplished by adding `Ember.View` instances to the
  container view.

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

  aContainer.toArray();  // [aContainer.aView, aContainer.bView]
  aContainer.pushObject(AnotherViewClass.create());
  aContainer.toArray(); // [aContainer.aView, aContainer.bView, <AnotherViewClass instance>]
  ```

  Will result in the following HTML

  ```html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
    <div class="ember-view">Another view</div>
  </div>
  ```

  ## Templates and Layout

  A `template`, `templateName`, `defaultTemplate`, `layout`, `layoutName` or
  `defaultLayout` property on a container view will not result in the template
  or layout being rendered. The HTML contents of a `Ember.ContainerView`'s DOM
  representation will only be the rendered HTML of its child views.

  @class ContainerView
  @namespace Ember
  @extends Ember.View
*/
Ember.ContainerView = Ember.View.extend(Ember.MutableArray, {
  states: states,

  init: function() {
    this._super();

    var childViews = get(this, 'childViews');

    // redefine view's childViews property that was obliterated
    Ember.defineProperty(this, 'childViews', Ember.View.childViewsProperty);

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
    if (currentView) {
      if (!_childViews.length) { _childViews = this._childViews = this._childViews.slice(); }
      _childViews.push(this.createChildView(currentView));
    }
  },

  replace: function(idx, removedCount, addedViews) {
    var addedCount = addedViews ? get(addedViews, 'length') : 0;
    var self = this;
    Ember.assert("You can't add a child to a container that is already a child of another view", Ember.A(addedViews).every(function(item) { return !get(item, '_parentView') || get(item, '_parentView') === self; }));

    this.arrayContentWillChange(idx, removedCount, addedCount);
    this.childViewsWillChange(this._childViews, idx, removedCount);

    if (addedCount === 0) {
      this._childViews.splice(idx, removedCount) ;
    } else {
      var args = [idx, removedCount].concat(addedViews);
      if (addedViews.length && !this._childViews.length) { this._childViews = this._childViews.slice(); }
      this._childViews.splice.apply(this._childViews, args);
    }

    this.arrayContentDidChange(idx, removedCount, addedCount);
    this.childViewsDidChange(this._childViews, idx, removedCount, addedCount);

    return this;
  },

  objectAt: function(idx) {
    return this._childViews[idx];
  },

  length: Ember.computed(function () {
    return this._childViews.length;
  }).volatile(),

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

  instrumentName: 'container',

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
    this.propertyWillChange('childViews');

    if (removed > 0) {
      var changedViews = views.slice(start, start+removed);
      // transition to preRender before clearing parentView
      this.currentState.childViewsWillChange(this, views, start, removed);
      this.initializeViews(changedViews, null, null);
    }
  },

  removeChild: function(child) {
    this.removeObject(child);
    return this;
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
    if (added > 0) {
      var changedViews = views.slice(start, start+added);
      this.initializeViews(changedViews, this, get(this, 'templateData'));
      this.currentState.childViewsDidChange(this, views, start, added);
    }
    this.propertyDidChange('childViews');
  },

  initializeViews: function(views, parentView, templateData) {
    forEach(views, function(view) {
      set(view, '_parentView', parentView);

      if (!view.container && parentView) {
        set(view, 'container', parentView.container);
      }

      if (!get(view, 'templateData')) {
        set(view, 'templateData', templateData);
      }
    });
  },

  currentView: null,

  _currentViewWillChange: Ember.beforeObserver('currentView', function() {
    var currentView = get(this, 'currentView');
    if (currentView) {
      currentView.destroy();
    }
  }),

  _currentViewDidChange: Ember.observer('currentView', function() {
    var currentView = get(this, 'currentView');
    if (currentView) {
      Ember.assert("You tried to set a current view that already has a parent. Make sure you don't have multiple outlets in the same view.", !get(currentView, '_parentView'));
      this.pushObject(currentView);
    }
  }),

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
    throw new Ember.Error('You cannot modify child views while in the inBuffer state');
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
    var childViews = view._childViews, i, len, childView, previous, buffer, viewCollection = new ViewCollection();

    for (i = 0, len = childViews.length; i < len; i++) {
      childView = childViews[i];

      if (!buffer) { buffer = Ember.RenderBuffer(); buffer._hasElement = false; }

      if (childView.renderToBufferIfNeeded(buffer)) {
        viewCollection.push(childView);
      } else if (viewCollection.length) {
        insertViewCollection(view, viewCollection, previous, buffer);
        buffer = null;
        previous = childView;
        viewCollection.clear();
      } else {
        previous = childView;
      }
    }

    if (viewCollection.length) {
      insertViewCollection(view, viewCollection, previous, buffer);
    }
  }
});

function insertViewCollection(view, viewCollection, previous, buffer) {
  viewCollection.triggerRecursively('willInsertElement');

  if (previous) {
    previous.domManager.after(previous, buffer.string());
  } else {
    view.domManager.prepend(view, buffer.string());
  }

  viewCollection.forEach(function(v) {
    v.transitionTo('inDOM');
    v.propertyDidChange('element');
    v.triggerRecursively('didInsertElement');
  });
}

