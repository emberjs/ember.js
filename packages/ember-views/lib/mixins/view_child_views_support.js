/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core';
import { Mixin } from "ember-metal/mixin";
import { removeObject } from "ember-metal/enumerable_utils";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import setProperties from "ember-metal/set_properties";
import { computed } from "ember-metal/computed";

var ViewChildViewsSupport = Mixin.create({
  /**
    Array of child views. You should never edit this array directly.
    Instead, use `appendChild` and `removeFromParent`.

    @property childViews
    @type Array
    @default []
    @private
  */
  childViews: computed(function() {

    if (!this._renderNode || !this._renderNode.childNodes) {
      return Ember.A();
    }

    let currentElementMorph, index, length;
    let childNodes = this._renderNode.childNodes;

    for (index = 0, length = this._renderNode.childNodes.length; index < length; index++) {
      let node = childNodes[index];
      if (node.isElementMorph) {
        currentElementMorph = node;
        break;
      }
    }

    var childViews = [];
    if (currentElementMorph.childNodes) {
      for (index = 0, length = currentElementMorph.childNodes.length; index < length; index++) {
        let node = currentElementMorph.childNodes[index];

        if (node.isElementMorph && node.emberView) {
          childViews.push(node.emberView);
        }
      }
    }

    return Ember.A(childViews);
  }),

  init() {
    this._super(...arguments);
    this.ownerView = this;
  },

  appendChild(view) {
    this.linkChild(view);
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
      throw new TypeError("createChildViews first argument must exist");
    }

    if (maybeViewClass.isView && maybeViewClass.parentView === this && maybeViewClass.container === this.container) {
      return maybeViewClass;
    }

    var attrs = _attrs || {};
    var view;
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

      Ember.assert("Could not find view: '" + fullName + "'", !!ViewKlass);

      view = ViewKlass.create(attrs);
    } else {
      view = maybeViewClass;
      Ember.assert('You must pass instance or subclass of View', view.isView);

      attrs.container = this.container;
      setProperties(view, attrs);
    }

    this.linkChild(view);

    return view;
  },

  linkChild(instance) {
    instance.container = this.container;
    set(instance, 'parentView', this);
    instance.trigger('parentViewDidChange');
    instance.ownerView = this.ownerView;
  },

  unlinkChild(instance) {
    set(instance, 'parentView', null);
    instance.trigger('parentViewDidChange');
  },

  _internalDidRender() {
    this._super(...arguments);

    this.notifyPropertyChange('childViews');
  }
});

export default ViewChildViewsSupport;
