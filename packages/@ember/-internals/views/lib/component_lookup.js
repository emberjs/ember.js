import { Object as EmberObject } from '@ember/-internals/runtime';

export default EmberObject.extend({
  componentFor(name, owner, options) {
    let fullName = `component:${name}`;
    return owner.factoryFor(fullName, options);
  },

  layoutFor(name, owner, options) {
    let templateFullName = `template:components/${name}`;
    return owner.lookup(templateFullName, options);
  },
});
