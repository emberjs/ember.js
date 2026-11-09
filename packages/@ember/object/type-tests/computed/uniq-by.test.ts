import { uniqBy } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(uniqBy('foo', 'bar')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @uniqBy('foo', 'key')
  declare uniqBy: unknown[];

  // @ts-expect-error Requires a key
  @uniqBy('foo')
  declare uniqBy2: unknown[];

  // @ts-expect-error Only takes one propertyKey
  @uniqBy('foo', 'key', 'key2')
  declare uniqBy3: unknown[];
}

new Foo();
