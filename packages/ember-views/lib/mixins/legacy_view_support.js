/**
@module ember
@submodule ember-views
*/
import { deprecate } from 'ember-metal/debug';
import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';

/**
  @class LegacyViewSupport
  @namespace Ember
  @private
*/
export default Mixin.create({
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

    let view = get(this, 'parentView');

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

    let view = get(this, 'parentView');

    while (view) {
      if (view instanceof klass) { return view; }
      view = get(view, 'parentView');
    }
  }
});
