import Ember from "ember-metal/core"; // Ember.assert, Ember.K

import merge from "ember-metal/merge";
import MutableArray from "ember-runtime/mixins/mutable_array";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

import View from "ember-views/views/view";

import {
  cloneStates,
  states as EmberViewStates
} from "ember-views/views/states";

import EmberError from "ember-metal/error";

import { forEach } from "ember-metal/enumerable_utils";

import { computed } from "ember-metal/computed";
import run from "ember-metal/run_loop";
import { defineProperty } from "ember-metal/properties";
import {
  observer,
  beforeObserver
} from "ember-metal/mixin";
import { A as emberA } from "ember-runtime/system/native_array";

/**
@module ember
@submodule ember-views
*/

var states = cloneStates(EmberViewStates);

/**
  A `ContainerView` is an `Ember.View` subclass that implements `Ember.MutableArray`
  allowing programmatic management of its child views.

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

  The container view implements `Ember.MutableArray` allowing programmatic management of its child views.

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
var ContainerView = View.extend(MutableArray, {
  _states: states,

  willWatchProperty: function(prop){
    Ember.deprecate(
      "ContainerViews should not be observed as arrays. This behavior will change in future implementations of ContainerView.",
      !prop.match(/\[]/) && prop.indexOf('@') !== 0
    );
  },

  init: function() {
    this._super();

    var childViews = get(this, 'childViews');

    // redefine view's childViews property that was obliterated
    defineProperty(this, 'childViews', View.childViewsProperty);

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
    Ember.assert("You can't add a child to a container - the child is already a child of another view", emberA(addedViews).every(function(item) { return !get(item, '_parentView') || get(item, '_parentView') === self; }));

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

  length: computed(function () {
    return this._childViews.length;
  }).volatile(),

  /**
    Instructs each child view to render to the passed render buffer.

    @private
    @method render
    @param {Ember.RenderBuffer} buffer the buffer to render to
  */
  render: function(buffer) {
    var element = buffer.element();
    var dom = buffer.dom;

    if (this.tagName === '') {
      if (this._morph) {
        this._childViewsMorph = this._morph;
      } else {
        element = dom.createDocumentFragment();
        this._childViewsMorph = dom.appendMorph(element, element);
      }
    } else {
      this._childViewsMorph = dom.createMorph(element, element.lastChild, null, element);
    }

    return element;
  },

  instrumentName: 'container',

  /**
    When a child view is removed, destroy its element so that
    it is removed from the DOM.

    The array observer that triggers this action is set up in the
    `renderToBuffer` method.

    @private
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
    When a child view is added, make sure the DOM gets updated appropriately.

    If the view has already rendered an element, we tell the child view to
    create an element and insert it into the DOM. If the enclosing container
    view has already written to a buffer, but not yet converted that buffer
    into an element, we insert the string representation of the child into the
    appropriate place in the buffer.

    @private
    @method childViewsDidChange
    @param {Ember.Array} views the array of child views after the mutation has occurred
    @param {Number} start the start position of the mutation
    @param {Number} removed the number of child views removed
    @param {Number} added the number of child views added
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

  _currentViewWillChange: beforeObserver('currentView', function() {
    var currentView = get(this, 'currentView');
    if (currentView) {
      currentView.destroy();
    }
  }),

  _currentViewDidChange: observer('currentView', function() {
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

merge(states._default, {
  childViewsWillChange: Ember.K,
  childViewsDidChange: Ember.K,
  ensureChildrenAreInDOM: Ember.K
});

merge(states.inBuffer, {
  childViewsDidChange: function(parentView, views, start, added) {
    throw new EmberError('You cannot modify child views while in the inBuffer state');
  }
});

merge(states.hasElement, {
  childViewsWillChange: function(view, views, start, removed) {
    for (var i=start; i<start+removed; i++) {
      views[i].remove();
    }
  },

  childViewsDidChange: function(view, views, start, added) {
    run.scheduleOnce('render', view, '_ensureChildrenAreInDOM');
  },

  ensureChildrenAreInDOM: function(view) {
    var childViews = view._childViews;
    var renderer = view._renderer;

    var i, len, childView;
    for (i = 0, len = childViews.length; i < len; i++) {
      childView = childViews[i];
      if (!childView._elementCreated) {
        renderer.renderTree(childView, view, i);
      }
    }
  }
});

export default ContainerView;
