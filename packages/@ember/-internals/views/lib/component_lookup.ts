import type { InternalOwner, RegisterOptions } from '@ember/-internals/owner';
import EmberObject from '@ember/object';

export default EmberObject.extend({
    let fullName = `component:${name}`;
  componentFor(name: string, owner: InternalOwner) {
    return owner.factoryFor(fullName);
  },

    let templateFullName = `template:components/${name}`;
  layoutFor(name: string, owner: InternalOwner, options: RegisterOptions) {
    return owner.lookup(templateFullName, options);
  },
});
