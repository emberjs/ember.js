import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';

export default Mixin.create({
  linkChild(instance) {
    instance.container = this.container;
    if (get(instance, 'parentView') !== this) {
      // linkChild should be idempotent
      set(instance, 'parentView', this);
      instance.trigger('parentViewDidChange');
    }
    instance.ownerView = this.ownerView;
  },

  unlinkChild(instance) {
    set(instance, 'parentView', null);
    instance.trigger('parentViewDidChange');
  }
});
