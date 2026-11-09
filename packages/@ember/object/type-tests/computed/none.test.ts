import { none } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(none('foo')).toMatchTypeOf<FieldDecorator>();

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
