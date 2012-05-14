// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/view');
var get = Ember.get, set = Ember.set, meta = Ember.meta;
var forEach = Ember.ArrayUtils.forEach;

var childViewsProperty = Ember.computed(function() {
  return get(this, '_childViews');
}).property('_childViews').cacheable();

/**
  @class

  A `ContainerView` is an `Ember.View` subclass that allows for manual or programatic
  management of a view's `childViews` array that will correctly update the `ContainerView`
  instance's rendered DOM representation.

  ## Setting Initial Child Views
  The initial array of child views can be set in one of two ways. You can provide
  a `childViews` property at creation time that contains instance of `Ember.View`:


        aContainer = Ember.ContainerView.create({
          childViews: [Ember.View.create(), Ember.View.create()]
        })

  You can also provide a list of property names whose values are instances of `Ember.View`:

        aContainer = Ember.ContainerView.create({
          childViews: ['aView', 'bView', 'cView'],
          aView: Ember.View.create(),
          bView: Ember.View.create()
          cView: Ember.View.create()
        })

  The two strategies can be combined:

        aContainer = Ember.ContainerView.create({
          childViews: ['aView', Ember.View.create()],
          aView: Ember.View.create()
        })

  Each child view's rendering will be inserted into the container's rendered HTML in the same
  order as its position in the `childViews` property.

  ## Adding and Removing Child Views
  The views in a container's `childViews` array should be added and removed by manipulating
  the `childViews` property directly.

  To remove a view pass that view into a `removeObject` call on the container's `childViews` property. 

  Given an empty `<body>` the following code

        aContainer = Ember.ContainerView.create({
          classNames: ['the-container'],
          childViews: ['aView', 'bView'],
          aView: Ember.View.create({
            template: Ember.Handlebars.compile("A")
          }),
          bView: Ember.View.create({
            template: Ember.Handlebars.compile("B")
          })
        })

        aContainer.appendTo('body')

  Results in the HTML

        <div class="ember-view the-container">
          <div class="ember-view">A</div>
          <div class="ember-view">B</div>
        </div>

  Removing a view

        aContainer.get('childViews') // [aContainer.aView, aContainer.bView]
        aContainer.get('childViews').removeObject(aContainer.get('bView'))
        aContainer.get('childViews') // [aContainer.aView]

  Will result in the following HTML

        <div class="ember-view the-container">
          <div class="ember-view">A</div>
        </div>


  Similarly, adding a child view is accomplished by adding `Ember.View` instances to the 
  container's `childViews` property.

  Given an empty `<body>` the following code

        aContainer = Ember.ContainerView.create({
          classNames: ['the-container'],
          childViews: ['aView', 'bView'],
          aView: Ember.View.create({
            template: Ember.Handlebars.compile("A")
          }),
          bView: Ember.View.create({
            template: Ember.Handlebars.compile("B")
          })
        })

        aContainer.appendTo('body')

  Results in the HTML

        <div class="ember-view the-container">
          <div class="ember-view">A</div>
          <div class="ember-view">B</div>
        </div>

  Adding a view

        AnotherViewClass = Ember.View.extend({
          template: Ember.Handlebars.compile("Another view")
        })

        aContainer.get('childViews') // [aContainer.aView, aContainer.bView]
        aContainer.get('childViews').pushObject(AnotherViewClass.create())
        aContainer.get('childViews') // [aContainer.aView, <AnotherViewClass instance>]

  Will result in the following HTML

        <div class="ember-view the-container">
          <div class="ember-view">A</div>
          <div class="ember-view">Another view</div>
        </div>


  Direct manipulation of childViews presence or absence in the DOM via calls to 
  `remove` or `removeFromParent` or calls to a container's `removeChild` may not behave
  correctly.

  Calling `remove()` on a child view will remove the view's HTML, but it will remain as part of its
  container's `childView`s property.

  Calling `removeChild()` on the container will remove the passed view instance from the container's
  `childView`s but keep its HTML within the container's rendered view.

  Calling `removeFromParent()` behaves as expected but should be avoided in favor of direct
  manipulation of a container's `childViews` property.

        aContainer = Ember.ContainerView.create({
          classNames: ['the-container'],
          childViews: ['aView', 'bView'],
          aView: Ember.View.create({
            template: Ember.Handlebars.compile("A")
          }),
          bView: Ember.View.create({
            template: Ember.Handlebars.compile("B")
          })
        })

        aContainer.appendTo('body')

  Results in the HTML

        <div class="ember-view the-container">
          <div class="ember-view">A</div>
          <div class="ember-view">B</div>
        </div>

  Calling `aContainer.get('aView').removeFromParent()` will result in the following HTML

        <div class="ember-view the-container">
          <div class="ember-view">B</div>
        </div>

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

      // Controller
      App.appController = Ember.Object.create({
        view: Ember.View.create({
          templateName: 'person_template'
        })
      });

      // Handlebars template
      {{view Ember.ContainerView currentViewBinding="App.appController.view"}}

  @extends Ember.View
*/

Ember.ContainerView = Ember.View.extend({

  init: function() {
    var childViews = get(this, 'childViews');
    Ember.defineProperty(this, 'childViews', childViewsProperty);

    this._super();

    var _childViews = get(this, '_childViews');

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
  },

  /**
    Instructs each child view to render to the passed render buffer.

    @param {Ember.RenderBuffer} buffer the buffer to render to
    @private
  */
  render: function(buffer) {
    this.forEachChildView(function(view) {
      view.renderToBuffer(buffer);
    });
  },

  /**
    When the container view is destroyed, tear down the child views
    array observer.

    @private
  */
  willDestroy: function() {
    get(this, 'childViews').removeArrayObserver(this, {
      willChange: 'childViewsWillChange',
      didChange: 'childViewsDidChange'
    });

    this._super();
  },

  /**
    When a child view is removed, destroy its element so that
    it is removed from the DOM.

    The array observer that triggers this action is set up in the
    `renderToBuffer` method.

    @private
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
    When a child view is added, make sure the DOM gets updated appropriately.

    If the view has already rendered an element, we tell the child view to
    create an element and insert it into the DOM. If the enclosing container view
    has already written to a buffer, but not yet converted that buffer into an
    element, we insert the string representation of the child into the appropriate
    place in the buffer.

    @private
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

  /**
    Schedules a child view to be inserted into the DOM after bindings have
    finished syncing for this run loop.

    @param {Ember.View} view the child view to insert
    @param {Ember.View} prev the child view after which the specified view should
                     be inserted
    @private
  */
  _scheduleInsertion: function(view, prev) {
    if (prev) {
      prev.domManager.after(prev, view);
    } else {
      this.domManager.prepend(this, view);
    }
  },

  currentView: null,

  _currentViewWillChange: Ember.beforeObserver(function() {
    var childViews = get(this, 'childViews'),
        currentView = get(this, 'currentView');

    if (currentView) {
      childViews.removeObject(currentView);
    }
  }, 'currentView'),

  _currentViewDidChange: Ember.observer(function() {
    var childViews = get(this, 'childViews'),
        currentView = get(this, 'currentView');

    if (currentView) {
      childViews.pushObject(currentView);
    }
  }, 'currentView')
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
      // If the DOM element for this container view already exists,
      // schedule each child view to insert its DOM representation after
      // bindings have finished syncing.
      var prev = start === 0 ? null : views[start-1];

      for (var i=start; i<start+added; i++) {
        view = views[i];
        this._scheduleInsertion(view, prev);
        prev = view;
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
