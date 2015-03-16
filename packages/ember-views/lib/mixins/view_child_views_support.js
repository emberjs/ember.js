/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core';
import { Mixin } from "ember-metal/mixin";
import { computed } from "ember-metal/computed";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import setProperties from "ember-metal/set_properties";
import EmberError from "ember-metal/error";
import { forEach, removeObject } from "ember-metal/enumerable_utils";
import { A as emberA } from "ember-runtime/system/native_array";

/**
  @class ViewChildViewsSupport
  @namespace Ember
*/
var childViewsProperty = computed(function() {
  var childViews = this._childViews;
  var ret = emberA();

  forEach(childViews, function(view) {
    var currentChildViews;
    if (view.isVirtual) {
      if (currentChildViews = get(view, 'childViews')) {
        ret.pushObjects(currentChildViews);
      }
    } else {
      ret.push(view);
    }
  });

  ret.replace = function (idx, removedCount, addedViews) {
    throw new EmberError("childViews is immutable");
  };

  return ret;
});

var EMPTY_ARRAY = [];

var ViewChildViewsSupport = Mixin.create({
  /**
    Array of child views. You should never edit this array directly.
    Instead, use `appendChild` and `removeFromParent`.

    @property childViews
    @type Array
    @default []
    @private
  */
  childViews: childViewsProperty,

  _childViews: EMPTY_ARRAY,

  init() {
    // setup child views. be sure to clone the child views array first
    this._childViews = this._childViews.slice();
    this.ownerView = this;

    this._super(...arguments);
  },

  appendChild(view, options) {
    return this.currentState.appendChild(this, view, options);
  },

  /**
    Removes the child view from the parent view.

    @method removeChild
    @param {Ember.View} view
    @return {Ember.View} receiver
  */
  removeChild(view) {
    // If we're destroying, the entire subtree will be
    // freed, and the DOM will be handled separately,
    // so no need to mess with childViews.
    if (this.isDestroying) { return; }

    // update parent node
    set(view, '_parentView', null);

    // remove view from childViews array.
    var childViews = this._childViews;

    removeObject(childViews, view);

    this.propertyDidChange('childViews'); // HUH?! what happened to will change?

    return this;
  },

  /**
    Instantiates a view to be added to the childViews array during view
    initialization. You generally will not call this method directly unless
    you are overriding `createChildViews()`. Note that this method will
    automatically configure the correct settings on the new view instance to
    act as a child of the parent.

    @method createChildView
    @param {Class|String} viewClass
    @param {Hash} [attrs] Attributes to add
    @return {Ember.View} new instance
  */
  createChildView(maybeViewClass, _attrs) {
    if (!maybeViewClass) {
      throw new TypeError("createChildViews first argument must exist");
    }

    if (maybeViewClass.isView && maybeViewClass._parentView === this && maybeViewClass.container === this.container) {
      return maybeViewClass;
    }

    var attrs = _attrs || {};
    var view;
    attrs._parentView = this;
    attrs.renderer = this.renderer;

    if (maybeViewClass.isViewClass) {
      attrs.container = this.container;

      view = maybeViewClass.create(attrs);

      // don't set the property on a virtual view, as they are invisible to
      // consumers of the view API
      if (view.viewName) {
        set(get(this, 'concreteView'), view.viewName, view);
      }
    } else if ('string' === typeof maybeViewClass) {
      var fullName = 'view:' + maybeViewClass;
      var ViewKlass = this.container.lookupFactory(fullName);

      Ember.assert("Could not find view: '" + fullName + "'", !!ViewKlass);

      view = ViewKlass.create(attrs);
    } else {
      view = maybeViewClass;
      Ember.assert('You must pass instance or subclass of View', view.isView);

      attrs.container = this.container;
      setProperties(view, attrs);
    }

    return view;
  },

  linkChild(instance) {
    instance.container = this.container;
    instance._parentView = this;
    instance.ownerView = this.ownerView;
  }
});

export default ViewChildViewsSupport;

export { childViewsProperty };
