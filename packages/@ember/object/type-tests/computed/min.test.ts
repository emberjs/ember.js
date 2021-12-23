import { min } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(min('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @min('foo') min: unknown;

  // @ts-expect-error Only takes one key
  @min('foo', 'bar')
  min2: unknown;

  // @ts-expect-error Requires a key
  @min()
  min3: unknown;
}

new Foo();
