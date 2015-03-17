import MutableArray from "ember-runtime/mixins/mutable_array";
import Component from "ember-views/views/component";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { forEach } from "ember-metal/enumerable_utils";

import containerViewTemplate from "ember-htmlbars/templates/container-view";
containerViewTemplate.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

/**
@module ember
@submodule ember-views
*/

//var states = cloneStates(EmberViewStates);

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
var ContainerView = Component.extend(MutableArray, {
  init() {
    this._super(...arguments);

    var userChildViews = get(this, 'childViews');
    Ember.deprecate('Setting `childViews` on a Container is deprecated.', Ember.isEmpty(userChildViews));

    // redefine view's childViews property that was obliterated
    var childViews = [];
    set(this, 'childViews', childViews);

    forEach(userChildViews, function(viewName, idx) {
      var view;

      if ('string' === typeof viewName) {
        view = get(this, viewName);
        view = this.createChildView(view);
        set(this, viewName, view);
      } else {
        view = this.createChildView(viewName);
      }

      childViews[idx] = view;
    }, this);

    var currentView = get(this, 'currentView');
    if (currentView) {
      if (!childViews.length) { childViews = this.childViews = this.childViews.slice(); }
      childViews.push(this.createChildView(currentView));
    }
  },

  layout: containerViewTemplate,

  replace(idx, removedCount, addedViews) {
    var addedCount = addedViews ? get(addedViews, 'length') : 0;
    var childViews = get(this, 'childViews');

    var removedViews = childViews.slice(idx, idx+removedCount);

    this.arrayContentWillChange(idx, removedCount, addedCount);
    forEach(removedViews, view => view.remove());

    if (addedCount === 0) {
      childViews.splice(idx, removedCount);
    } else {
      if (!childViews.length) {
        childViews = childViews.slice();
        set(this, 'childViews', childViews);
      }
      forEach(addedViews, view => this.linkChild(view));
      childViews.splice(idx, removedCount, ...addedViews);
      this.notifyPropertyChange('childViews');
    }
    this.arrayContentDidChange(idx, removedCount, addedCount);

    //this.childViewsWillChange(this._childViews, idx, removedCount);
    //this.childViewsDidChange(this._childViews, idx, removedCount, addedCount);

    //Ember.assert("You can't add a child to a container - the child is already a child of another view", emberA(addedViews).every(function(item) { return !item._parentView || item._parentView === self; }));

    set(this, 'length', childViews.length);

    return this;
  },

  removeChild(child) {
    this.removeObject(child);
    return this;
  },

  objectAt(idx) {
    return get(this, 'childViews')[idx];
  }
});

export default ContainerView;
