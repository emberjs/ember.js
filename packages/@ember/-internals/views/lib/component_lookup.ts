import { Owner, TypeOptions } from '@ember/-internals/owner';
import { Object as EmberObject } from '@ember/-internals/runtime';

export default EmberObject.extend({
  componentFor(name: string, owner: Owner) {
    let fullName = `component:${name}`;
    return owner.factoryFor(fullName);
  },

  layoutFor(name: string, owner: Owner, options: TypeOptions) {
    let templateFullName = `template:components/${name}`;
    return owner.lookup(templateFullName, options);
  },
});
