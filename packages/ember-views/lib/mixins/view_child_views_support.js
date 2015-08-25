/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import setProperties from 'ember-metal/set_properties';

var EMPTY_ARRAY = [];

export default Mixin.create({
  /**
    Array of child views. You should never edit this array directly.
    Instead, use `appendChild` and `removeFromParent`.

    @property childViews
    @type Array
    @default []
    @private
  */
  childViews: EMPTY_ARRAY,

  init() {
    this._super(...arguments);

    // setup child views. be sure to clone the child views array first
    // 2.0TODO: Remove Ember.A() here
    this.childViews = Ember.A(this.childViews.slice());
    this.ownerView = this.ownerView || this;
  },

  appendChild(view) {
    this.linkChild(view);
    this.childViews.push(view);
  },

  destroyChild(view) {
    view.destroy();
  },

  /**
    Removes the child view from the parent view.

    @method removeChild
    @param {Ember.View} view
    @return {Ember.View} receiver
    @private
  */
  removeChild(view) {
    // If we're destroying, the entire subtree will be
    // freed, and the DOM will be handled separately,
    // so no need to mess with childViews.
    if (this.isDestroying) { return; }

    // update parent node
    this.unlinkChild(view);

    // remove view from childViews array.
    var childViews = get(this, 'childViews');

    var index = childViews.indexOf(view);
    if (index !== -1) { childViews.splice(index, 1); }

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
    @param {Object} [attrs] Attributes to add
    @return {Ember.View} new instance
    @private
  */
  createChildView(maybeViewClass, _attrs) {
    if (!maybeViewClass) {
      throw new TypeError('createChildViews first argument must exist');
    }

    if (maybeViewClass.isView && maybeViewClass.parentView === this && maybeViewClass.container === this.container) {
      return maybeViewClass;
    }

    var attrs = _attrs || {};
    var view;

    attrs.parentView = this;
    attrs.renderer = this.renderer;
    attrs._viewRegistry = this._viewRegistry;

    if (maybeViewClass.isViewFactory) {
      attrs.container = this.container;

      view = maybeViewClass.create(attrs);

      if (view.viewName) {
        set(this, view.viewName, view);
      }
    } else if ('string' === typeof maybeViewClass) {
      var fullName = 'view:' + maybeViewClass;
      var ViewKlass = this.container.lookupFactory(fullName);

      assert('Could not find view: \'' + fullName + '\'', !!ViewKlass);

      view = ViewKlass.create(attrs);
    } else {
      view = maybeViewClass;
      assert('You must pass instance or subclass of View', view.isView);

      attrs.container = this.container;
      setProperties(view, attrs);
    }

    this.linkChild(view);

    return view;
  },

  linkChild(instance) {
    instance.container = this.container;
    instance.parentView = this;
    instance.ownerView = this.ownerView;
  },

  unlinkChild(instance) {
    instance.parentView = null;
  }
});
