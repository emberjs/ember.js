import EmberObject from '@ember/object';
export default EmberObject.extend({
  componentFor(name, owner) {
    let fullName = `component:${name}`;
    return owner.factoryFor(fullName);
  },
  layoutFor(name, owner, options) {
    let templateFullName = `template:components/${name}`;
    return owner.lookup(templateFullName, options);
  }
});