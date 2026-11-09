import { max } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(max('foo')).toEqualTypeOf<FieldDecorator>();

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
