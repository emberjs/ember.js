/**
@module ember
@submodule ember-views
*/
import { deprecate } from 'ember-metal/debug';
import { Mixin, observer } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';

/**
  @class LegacyViewSupport
  @namespace Ember
  @private
*/
var LegacyViewSupport = Mixin.create({
  beforeRender(buffer) {},

  afterRender(buffer) {},

  walkChildViews(callback) {
    var childViews = this.childViews.slice();

    while (childViews.length) {
      var view = childViews.pop();
      callback(view);
      childViews.push(...view.childViews);
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
    deprecate(
      'nearestChildOf has been deprecated.',
      false,
      { id: 'ember-views.nearest-child-of', until: '3.0.0' }
    );

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
    deprecate(
      'nearestInstanceOf is deprecated and will be removed from future releases. Use nearestOfType.',
      false,
      { id: 'ember-views.nearest-instance-of', until: '3.0.0' }
    );

    var view = get(this, 'parentView');

    while (view) {
      if (view instanceof klass) { return view; }
      view = get(view, 'parentView');
    }
  },

  /**
    If a value that affects template rendering changes, the view should be
    re-rendered to reflect the new value.

    @method _contextDidChange
    @private
    @private
  */
  _contextDidChange: observer('context', function() {
    this.rerender();
  })
});

export default LegacyViewSupport;
