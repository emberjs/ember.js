import { max } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(max('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @max('foo') max: unknown;

  // @ts-expect-error Only takes one key
  @max('foo', 'bar')
  max2: unknown;

  // @ts-expect-error Requires a key
  @max()
  max3: unknown;
}

new Foo();
