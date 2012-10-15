require('ember-views/views/view');

/**
@module ember
@submodule ember-views
*/

var get = Ember.get, set = Ember.set, meta = Ember.meta;
var forEach = Ember.EnumerableUtils.forEach;

var childViewsProperty = Ember.computed(function() {
  return get(this, '_childViews');
}).property('_childViews').cacheable();

/**
  A `ContainerView` is an `Ember.View` subclass that allows for manual or programatic
  management of a view's `childViews` array that will correctly update the `ContainerView`
  instance's rendered DOM representation.

  ## Setting Initial Child Views
  The initial array of child views can be set in one of two ways. You can provide
  a `childViews` property at creation time that contains instance of `Ember.View`:

  ``` javascript
  aContainer = Ember.ContainerView.create({
    childViews: [Ember.View.create(), Ember.View.create()]
  });
  ```

  You can also provide a list of property names whose values are instances of `Ember.View`:

  ``` javascript
  aContainer = Ember.ContainerView.create({
    childViews: ['aView', 'bView', 'cView'],
    aView: Ember.View.create(),
    bView: Ember.View.create()
    cView: Ember.View.create()
  });
  ```

  The two strategies can be combined:

  ``` javascript
  aContainer = Ember.ContainerView.create({
    childViews: ['aView', Ember.View.create()],
    aView: Ember.View.create()
  });
  ```

  Each child view's rendering will be inserted into the container's rendered HTML in the same
  order as its position in the `childViews` property.

  ## Adding and Removing Child Views
  The views in a container's `childViews` array should be added and removed by manipulating
  the `childViews` property directly.

  To remove a view pass that view into a `removeObject` call on the container's `childViews` property.

  Given an empty `<body>` the following code

  ``` javascript
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

  ``` html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
  </div>
  ```

  Removing a view

  ``` javascript
  aContainer.get('childViews'); // [aContainer.aView, aContainer.bView]
  aContainer.get('childViews').removeObject(aContainer.get('bView'));
  aContainer.get('childViews'); // [aContainer.aView]
  ```

  Will result in the following HTML

  ``` html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
  </div>
  ```


  Similarly, adding a child view is accomplished by adding `Ember.View` instances to the
  container's `childViews` property.

  Given an empty `<body>` the following code

  ``` javascript
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

  ``` html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
  </div>
  ```

  Adding a view

  ``` javascript
  AnotherViewClass = Ember.View.extend({
    template: Ember.Handlebars.compile("Another view")
  });

  aContainer.get('childViews'); // [aContainer.aView, aContainer.bView]
  aContainer.get('childViews').pushObject(AnotherViewClass.create());
  aContainer.get('childViews'); // [aContainer.aView, aContainer.bView, <AnotherViewClass instance>]
  ```

  Will result in the following HTML

  ``` html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
    <div class="ember-view">Another view</div>
  </div>
  ```


  Direct manipulation of childViews presence or absence in the DOM via calls to
  `remove` or `removeFromParent` or calls to a container's `removeChild` may not behave
  correctly.

  Calling `remove()` on a child view will remove the view's HTML, but it will remain as part of its
  container's `childView`s property.

  Calling `removeChild()` on the container will remove the passed view instance from the container's
  `childView`s but keep its HTML within the container's rendered view.

  Calling `removeFromParent()` behaves as expected but should be avoided in favor of direct
  manipulation of a container's `childViews` property.

  ``` javascript
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

  ``` html
  <div class="ember-view the-container">
    <div class="ember-view">A</div>
    <div class="ember-view">B</div>
  </div>
  ```

  Calling `aContainer.get('aView').removeFromParent()` will result in the following HTML

  ``` html
  <div class="ember-view the-container">
    <div class="ember-view">B</div>
  </div>
  ```

  And the `Ember.View` instance stored in `aContainer.aView` will be removed from `aContainer`'s
  `childViews` array.

  ## Templates and Layout

  A `template`, `templateName`, `defaultTemplate`, `layout`, `layoutName` or `defaultLayout`
  property on a container view will not result in the template or layout being rendered.
  The HTML contents of a `Ember.ContainerView`'s DOM representation will only be the rendered HTML
  of its child views.

  ## Binding a View to Display

  If you would like to display a single view in your ContainerView, you can set its `currentView`
  property. When the `currentView` property is set to a view instance, it will be added to the
  ContainerView's `childViews` array. If the `currentView` property is later changed to a
  different view, the new view will replace the old view. If `currentView` is set to `null`, the
  last `currentView` will be removed.

  This functionality is useful for cases where you want to bind the display of a ContainerView to
  a controller or state manager. For example, you can bind the `currentView` of a container to
  a controller like this:

  ``` javascript
  App.appController = Ember.Object.create({
    view: Ember.View.create({
      templateName: 'person_template'
    })
  });
  ```

  ``` handlebars
  {{view Ember.ContainerView currentViewBinding="App.appController.view"}}
  ```

  ## Use lifecycle hooks

  This is an example of how you could implement reusable currentView view.

  ``` javascript
  App.ContainerView = Ember.ContainerView.extend({
    appendCurrentView: function(currentView, callback) {
      currentView.set('isVisible', true);

      if (!this.get('childViews').contains(currentView)) {
        this._super(currentView, callback);
      } else {
        callback();
      }
    },
    removeCurrentView: function(currentView, callback) {
      if (currentView.get('isShared')) {
        currentView.set('isVisible', false);
        callback();
      } else {
        this._super(currentView, callback);
      }
    }
  });
  ````

  This is an example of how you could implement animations.

  ```` javascript
  App.ContainerView = Ember.ContainerView.extend({
    presentCurrentView: function(currentView, callback) {
      currentView.$().animate({top: '0px'}, callback);
    },
    dismissCurrentView: function(currentView, callback) {
      currentView.$().animate({top: '-100px'}, callback);
    }
  });
  ````

  @class ContainerView
  @namespace Ember
  @extends Ember.View
*/

Ember.ContainerView = Ember.View.extend({

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

    // Make the _childViews array observable
    Ember.A(_childViews);

    // Sets up an array observer on the child views array. This
    // observer will detect when child views are added or removed
    // and update the DOM to reflect the mutation.
    get(this, 'childViews').addArrayObserver(this, {
      willChange: 'childViewsWillChange',
      didChange: 'childViewsDidChange'
    });

    // Make sure we initialize with currentView if it is present
    var currentView = get(this, 'currentView');
    if (currentView) { this._currentViewDidChange(); }
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

    this.invokeForState('childViewsWillChange', views, start, removed);
  },

  /**
    @private

    When a child view is added, make sure the DOM gets updated appropriately.

    If the view has already rendered an element, we tell the child view to
    create an element and insert it into the DOM. If the enclosing container view
    has already written to a buffer, but not yet converted that buffer into an
    element, we insert the string representation of the child into the appropriate
    place in the buffer.

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
    this.invokeForState('childViewsDidChange', views, start, added);
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

  /**
    This method is responsible for presenting a new view.
    Default implementation will simply call the callback.
    You can override this method if you want to add an animation for example.

    @method presentCurrentView
    @param  {Ember.View} currentView a view to present
    @param  {Function}   callback the callback called once operation is terminated
   */
  presentCurrentView: function(currentView, callback) {
    callback();
  },

  /**
    This method is responsible for adding view to containerView

    @method appendCurrentView
    @param  {Ember.View} currentView a view to present
    @param  {Function}   callback the callback called once view is appended
  */
  appendCurrentView: function(currentView, callback) {
    var childViews = get(this, 'childViews');

    currentView.one('didInsertElement', callback);

    childViews.pushObject(currentView);
  },

  /**
    This method is responsible for dismissing a view.
    Default implementation will simply call the callback.
    You can override this method if you want to add an animation for example.

    @method dismissCurrentView
    @param  {Ember.View} currentView a view to dismiss
    @param  {Function}   callback the callback called once operation is terminated
   */
  dismissCurrentView: function(currentView, callback) {
    callback();
  },

  /**
    This method is responsible for removing a view from the containerView
    You may want to override it in case you implementing views sharing for example

    @method removeCurrentView
    @param  {Ember.View} currentView a view to present
    @param  {Function}   callback the callback called once view is removed
  */
  removeCurrentView: function(currentView, callback) {
    var childViews = get(this, 'childViews');

    currentView.one('didDisappear', function() {
      currentView.destroy();
    });

    childViews.removeObject(currentView);

    callback();
  },

  _currentViewWillChange: Ember.beforeObserver(function() {
    var currentView = get(this, 'currentView'),
        containerView = this;

    if (currentView) {
      set(currentView, 'isBeingDismissed', true);
      currentView.trigger('willDisappear', currentView);

      this.dismissCurrentView(currentView, function() {
        containerView.removeCurrentView(currentView, function() {
          set(currentView, 'isBeingDismissed', false);
          currentView.trigger('didDisappear', currentView);
        });
      });
    }
  }, 'currentView'),

  _currentViewDidChange: Ember.observer(function() {
    var currentView = get(this, 'currentView'),
        containerView = this;

    if (currentView) {
      set(currentView, 'isBeingPresented', true);
      currentView.trigger('willAppear', currentView);

      this.appendCurrentView(currentView, function() {
        containerView.presentCurrentView(currentView, function() {
          set(currentView, 'isBeingPresented', false);
          currentView.trigger('didAppear', currentView);
        });
      });
    }
  }, 'currentView'),

  _ensureChildrenAreInDOM: function () {
    this.invokeForState('ensureChildrenAreInDOM', this);
  }
});

// Ember.ContainerView extends the default view states to provide different
// behavior for childViewsWillChange and childViewsDidChange.
Ember.ContainerView.states = {
  parent: Ember.View.states,

  inBuffer: {
    childViewsDidChange: function(parentView, views, start, added) {
      var buffer = parentView.buffer,
          startWith, prev, prevBuffer, view;

      // Determine where to begin inserting the child view(s) in the
      // render buffer.
      if (start === 0) {
        // If views were inserted at the beginning, prepend the first
        // view to the render buffer, then begin inserting any
        // additional views at the beginning.
        view = views[start];
        startWith = start + 1;
        view.renderToBuffer(buffer, 'prepend');
      } else {
        // Otherwise, just insert them at the same place as the child
        // views mutation.
        view = views[start - 1];
        startWith = start;
      }

      for (var i=startWith; i<start+added; i++) {
        prev = view;
        view = views[i];
        prevBuffer = prev.buffer;
        view.renderToBuffer(prevBuffer, 'insertAfter');
      }
    }
  },

  hasElement: {
    childViewsWillChange: function(view, views, start, removed) {
      for (var i=start; i<start+removed; i++) {
        views[i].remove();
      }
    },

    childViewsDidChange: function(view, views, start, added) {
      Ember.run.scheduleOnce('render', this, '_ensureChildrenAreInDOM');
    },

    ensureChildrenAreInDOM: function(view) {
      var childViews = view.get('childViews'), i, len, childView, previous, buffer;
      for (i = 0, len = childViews.length; i < len; i++) {
        childView = childViews[i];
        buffer = childView.renderToBufferIfNeeded();
        if (buffer) {
          childView._notifyWillInsertElement();
          if (previous) {
            previous.domManager.after(previous, buffer.string());
          } else {
            view.domManager.prepend(view, buffer.string());
          }
          childView.transitionTo('inDOM');
          childView.propertyDidChange('element');
          childView._notifyDidInsertElement();
        }
        previous = childView;
      }
    }
  }
};

Ember.ContainerView.states.inDOM = {
  parentState: Ember.ContainerView.states.hasElement
};

Ember.ContainerView.reopen({
  states: Ember.ContainerView.states
});
