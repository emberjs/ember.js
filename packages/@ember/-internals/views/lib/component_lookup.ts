import type { InternalOwner, RegisterOptions } from '@ember/-internals/owner';
import EmberObject from '@ember/object';

export default EmberObject.extend({
  componentFor(name: string, owner: Owner) {
    let fullName = `component:${name}`;
    return owner.factoryFor(fullName);
  },

    let templateFullName = `template:components/${name}`;
  layoutFor(name: string, owner: Owner, options: RegisterOptions) {
    return owner.lookup(templateFullName, options);
  },
});
