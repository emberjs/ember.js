import { none } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(none('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @none('foo') none: unknown;

  // @ts-expect-error Only takes one key
  @none('foo', 'bar')
  none2: unknown;

  // @ts-expect-error Requires a key
  @none()
  none3: unknown;
}

new Foo();
