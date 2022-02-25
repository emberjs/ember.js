import getAllPropertyNames from './get-all-property-names';

export interface Generator {
  cases: unknown[];
  generate: (...args: unknown[]) => unknown;
}

export interface GeneratorClass<T extends Generator> extends Function {
  new (): T;
}

export type Mixin<T extends Generator> = T | GeneratorClass<T> | Record<string, unknown>;

function isGenerator(mixin: unknown): mixin is Generator {
  if (mixin && typeof mixin === 'object') {
    let cast = mixin as Generator;
    return Array.isArray(cast.cases) && typeof cast.generate === 'function';
  }
  return false;
}

function isGeneratorClass<T extends Generator>(mixin: unknown): mixin is GeneratorClass<T> {
  return typeof mixin === 'function';
}

export default function applyMixins<T extends Generator>(
  TestClass: Function,
  ...mixins: Mixin<T>[]
) {
  mixins.forEach((mixinOrGenerator) => {
    let mixin: object;

    if (isGenerator(mixinOrGenerator)) {
      let generator = mixinOrGenerator;
      mixin = {};

      generator.cases.forEach((value, idx) => {
        Object.assign(mixin, generator.generate(value, idx));
      });

      Object.assign(TestClass.prototype, mixin);
    } else if (isGeneratorClass(mixinOrGenerator)) {
      let properties = getAllPropertyNames(mixinOrGenerator);
      mixin = new mixinOrGenerator();

      properties.forEach((name) => {
        TestClass.prototype[name] = function () {
          return mixin[name].apply(mixin, arguments);
        };
      });
    } else {
      mixin = mixinOrGenerator;
      Object.assign(TestClass.prototype, mixin);
    }
  });

  return TestClass;
}
