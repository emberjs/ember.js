import { assign } from '@ember/polyfills';
import getAllPropertyNames from './get-all-property-names';

function isGenerator(mixin) {
  return Array.isArray(mixin.cases) && typeof mixin.generate === 'function';
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
      let properties = getAllPropertyNames(mixinOrGenerator);
      mixin = new mixinOrGenerator();

      properties.forEach(name => {
        TestClass.prototype[name] = function() {
          return mixin[name].apply(mixin, arguments);
        };
      });
    } else {
      mixin = mixinOrGenerator;
      assign(TestClass.prototype, mixin);
    }
  });

  return TestClass;
}
