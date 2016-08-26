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
  },

  appendChild(view) {
    this.linkChild(view);
    this.childViews.push(view);
  },

  linkChild(instance) {
    if (!instance[OWNER]) {
      setOwner(instance, getOwner(this));
    }
  }
});
