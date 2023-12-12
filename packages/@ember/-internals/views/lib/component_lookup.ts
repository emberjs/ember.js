import type { InternalOwner, RegisterOptions } from '@ember/-internals/owner';
import EmberObject from '@ember/object';

export default EmberObject.extend({
  componentFor(name: string, owner: InternalOwner) {
    let fullName = `component:${name}` as const;
    return owner.factoryFor(fullName);
  },

  layoutFor(name: string, owner: InternalOwner, options: RegisterOptions) {
    let templateFullName = `template:components/${name}` as const;
    return owner.lookup(templateFullName, options);
  },
});
