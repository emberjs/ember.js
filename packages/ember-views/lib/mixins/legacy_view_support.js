/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core';
import { Mixin } from "ember-metal/mixin";
import { get } from "ember-metal/property_get";

/**
  @class LegacyViewSupport
  @namespace Ember
  @private
*/
var LegacyViewSupport = Mixin.create({
  beforeRender(buffer) {},

  afterRender(buffer) {},

  walkChildViews(callback) {
    var childViews = get(this, 'childViews').slice();

    while (childViews.length) {
      var view = childViews.pop();
      callback(view);
      childViews.push(...get(view, 'childViews'));
    }
  },

  mutateChildViews(callback) {
    var childViews = get(this, 'childViews');
    var idx = childViews.length;
    var view;

    while (--idx >= 0) {
      view = childViews[idx];
      callback(this, view, idx);
    }

    return this;
  },

  /**
    Removes all children from the `parentView`.

    @method removeAllChildren
    @return {Ember.View} receiver
    @private
  */
  removeAllChildren() {
    return this.mutateChildViews(function(parentView, view) {
      parentView.removeChild(view);
    });
  },

  destroyAllChildren() {
    return this.mutateChildViews(function(parentView, view) {
      view.destroy();
    });
  },

  /**
    Return the nearest ancestor whose parent is an instance of
    `klass`.

    @method nearestChildOf
    @param {Class} klass Subclass of Ember.View (or Ember.View itself)
    @return Ember.View
    @deprecated
    @private
  */
  nearestChildOf(klass) {
    Ember.deprecate("nearestChildOf has been deprecated.");

    var view = get(this, 'parentView');

    while (view) {
      if (get(view, 'parentView') instanceof klass) { return view; }
      view = get(view, 'parentView');
    }
  },

  /**
    Return the nearest ancestor that is an instance of the provided
    class.

    @method nearestInstanceOf
    @param {Class} klass Subclass of Ember.View (or Ember.View itself)
    @return Ember.View
    @deprecated
    @private
  */
  nearestInstanceOf(klass) {
    Ember.deprecate("nearestInstanceOf is deprecated and will be removed from future releases. Use nearestOfType.");
    var view = get(this, 'parentView');

    while (view) {
      if (view instanceof klass) { return view; }
      view = get(view, 'parentView');
    }
  }
});

export default LegacyViewSupport;
