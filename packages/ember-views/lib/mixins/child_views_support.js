/**
@module ember
@submodule ember-views
*/
import { Mixin } from 'ember-metal/mixin';
import { getOwner, setOwner, OWNER } from 'container/owner';

export default Mixin.create({
  init() {
    this._super(...arguments);

    /**
      Array of child views. You should never edit this array directly.

      @property childViews
      @type Array
      @default []
      @private
    */
    this.childViews = [];
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
    let { childViews } = this;

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
