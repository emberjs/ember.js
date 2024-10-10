import { template, type EmberPrecompileOptions } from '@ember/template-compiler';
import { expectTypeOf } from 'expect-type';

expectTypeOf(template).toEqualTypeOf<
  (template: string, options?: Partial<EmberPrecompileOptions>) => object
>();
