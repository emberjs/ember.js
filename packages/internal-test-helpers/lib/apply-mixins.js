import { assign } from 'ember-utils';

function isGenerator(mixin) {
  return Array.isArray(mixin.cases) && (typeof mixin.generate === 'function');
}

export default function applyMixins(TestClass, ...mixins) {
  mixins.forEach(mixinOrGenerator => {
    let mixin;

    if (isGenerator(mixinOrGenerator)) {
      let generator = mixinOrGenerator;
      mixin = {};

      generator.cases.forEach((value, idx) => {
        assign(mixin, generator.generate(value, idx));
      });

      assign(TestClass.prototype, mixin);
    } else if (typeof mixinOrGenerator === 'function') {
      mixin = new mixinOrGenerator();
      for (let key in mixin) {
        TestClass.prototype[key] = mixin[key];
      }
    } else {
      mixin = mixinOrGenerator;
      assign(TestClass.prototype, mixin);
    }


  });

  return TestClass;
}
