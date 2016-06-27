/**
@module ember
@submodule ember-views
*/
import { assert } from 'ember-metal/debug';
import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import setProperties from 'ember-metal/set_properties';
import { A as emberA } from 'ember-runtime/system/native_array';
import { getOwner, setOwner, OWNER } from 'container/owner';

const EMPTY_ARRAY = [];

export default Mixin.create({
  /**
    Array of child views. You should never edit this array directly.

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
    this.childViews = emberA(this.childViews.slice());
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
    let childViews = get(this, 'childViews');

    let index = childViews.indexOf(view);
    if (index !== -1) { childViews.splice(index, 1); }

    return this;
  },

  linkChild(instance) {
    if (!instance[OWNER]) {
      setOwner(instance, getOwner(this));
    }

    instance.parentView = this;
    instance.ownerView = this.ownerView;
  },

  unlinkChild(instance) {
    instance.parentView = null;
  }
});
