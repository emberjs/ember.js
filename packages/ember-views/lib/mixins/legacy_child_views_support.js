import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { getOwner, setOwner } from 'container/owner';

export default Mixin.create({
  linkChild(instance) {
    setOwner(instance, getOwner(this));
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
