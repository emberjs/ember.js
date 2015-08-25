import Ember from 'ember-metal/core';
import { assert, deprecate } from 'ember-metal/debug';
import MutableArray from 'ember-runtime/mixins/mutable_array';
import View from 'ember-views/views/view';

import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { observer } from 'ember-metal/mixin';
import { on } from 'ember-metal/events';

import containerViewTemplate from 'ember-htmlbars/templates/container-view';
containerViewTemplate.meta.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

/**
@module ember
@submodule ember-views
*/

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
      template: Ember.HTMLBars.compile("A")
    }),
    bView: Ember.View.create({
      template: Ember.HTMLBars.compile("B")
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
      template: Ember.HTMLBars.compile("A")
    }),
    bView: Ember.View.create({
      template: Ember.HTMLBars.compile("B")
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
    template: Ember.HTMLBars.compile("Another view")
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
  @deprecated See http://emberjs.com/deprecations/v1.x/#toc_ember-containerview
  @private
*/
var ContainerView = View.extend(MutableArray, {
  willWatchProperty(prop) {
    deprecate(
      'ContainerViews should not be observed as arrays. This behavior will change in future implementations of ContainerView.',
      !prop.match(/\[]/) && prop.indexOf('@') !== 0,
      { id: 'ember-views.container-views-array-observed', until: '2.4.0' }
    );
  },

  init() {
    this._super(...arguments);
    this._prevCurrentView = undefined;
    var userChildViews = get(this, 'childViews');
    deprecate(
      'Setting `childViews` on a Container is deprecated.',
      Ember.isEmpty(userChildViews),
      { id: 'ember-views.container-child-views', until: '2.4.0' }
    );

    // redefine view's childViews property that was obliterated
    // 2.0TODO: Don't Ember.A() this so users disabling prototype extensions
    // don't pay a penalty.
    var childViews = this.childViews = Ember.A([]);

    userChildViews.forEach((viewName, idx) => {
      var view;

      if ('string' === typeof viewName) {
        view = get(this, viewName);
        view = this.createChildView(view);
        set(this, viewName, view);
      } else {
        view = this.createChildView(viewName);
      }

      childViews[idx] = view;
    });

    var currentView = get(this, 'currentView');
    if (currentView) {
      if (!childViews.length) { childViews = this.childViews = Ember.A(this.childViews.slice()); }
      childViews.push(this.createChildView(currentView));
    }

    set(this, 'length', childViews.length);
  },

  // Normally parentView and childViews are managed at render time.  However,
  // the ContainerView is an unusual legacy case. People expect to be able to
  // push a child view into the ContainerView and have its parentView set
  // appropriately. As a result, we link the child nodes ahead of time and
  // ignore render-time linking.
  appendChild(view) {
    // This occurs if the view being appended is the empty view, rather than
    // a view eagerly inserted into the childViews array.
    if (view.parentView !== this) {
      this.linkChild(view);
    }
  },

  _currentViewDidChange: observer('currentView', function() {
    var prevView = this._prevCurrentView;
    if (prevView) {
      prevView.destroy();
    }
    var currentView = get(this, 'currentView');
    this._prevCurrentView = currentView;
    if (currentView) {
      assert('You tried to set a current view that already has a parent. Make sure you don\'t have multiple outlets in the same view.', !currentView.parentView);
      this.pushObject(currentView);
    }
  }),

  layout: containerViewTemplate,

  replace(idx, removedCount, addedViews=[]) {
    var addedCount = get(addedViews, 'length');
    var childViews = get(this, 'childViews');

    assert('You can\'t add a child to a container - the child is already a child of another view', () => {
      for (var i = 0, l = addedViews.length; i < l; i++) {
        var item = addedViews[i];
        if (item.parentView && item.parentView !== this) { return false; }
      }
      return true;
    });

    this.arrayContentWillChange(idx, removedCount, addedCount);

    // Normally parentView and childViews are managed at render time.  However,
    // the ContainerView is an unusual legacy case. People expect to be able to
    // push a child view into the ContainerView and have its parentView set
    // appropriately.
    //
    // Because of this, we synchronously fix up the parentView/childViews tree
    // as soon as views are added or removed, despite the fact that this will
    // happen automatically when we render.
    var removedViews = childViews.slice(idx, idx + removedCount);
    removedViews.forEach(view => this.unlinkChild(view));
    addedViews.forEach(view => this.linkChild(view));

    childViews.splice(idx, removedCount, ...addedViews);

    this.notifyPropertyChange('childViews');
    this.arrayContentDidChange(idx, removedCount, addedCount);

    // assert("You can't add a child to a container - the child is already a child of another view", emberA(addedViews).every(function(item) { return !item.parentView || item.parentView === self; }));

    set(this, 'length', childViews.length);

    return this;
  },

  objectAt(idx) {
    return this.childViews[idx];
  },

  _triggerChildWillDestroyElement: on('willDestroyElement', function () {
    var childViews = this.childViews;
    if (childViews) {
      for (var i = 0; i < childViews.length; i++) {
        this.renderer.willDestroyElement(childViews[i]);
      }
    }
  }),

  _triggerChildDidDestroyElement: on('didDestroyElement', function () {
    var childViews = this.childViews;
    if (childViews) {
      for (var i = 0; i < childViews.length; i++) {
        this.renderer.didDestroyElement(childViews[i]);
      }
    }
  })
});

function containerViewDeprecationMessage() {
  deprecate(
    'Ember.ContainerView is deprecated.',
    !!Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT,
    {
      url: 'http://emberjs.com/deprecations/v1.x/#toc_ember-containerview',
      id: 'ember-views.container-view',
      until: '2.4.0'
    }
  );
}

export var DeprecatedContainerView = ContainerView.extend({
  init() {
    containerViewDeprecationMessage();
    this._super.apply(this, arguments);
  }
});

DeprecatedContainerView.reopen = function() {
  containerViewDeprecationMessage();
  ContainerView.reopen(...arguments);
  return this;
};

export default ContainerView;
