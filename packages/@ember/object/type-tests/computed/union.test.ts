import { union } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(union('foo')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @union('foo') declare union: unknown[];
  @union('foo', 'bar', 'baz') declare union2: unknown[];

  // @ts-expect-error it requires a key
  @union()
  declare union3: unknown[];
}

new Foo();
