import { intersect } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(intersect('foo')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @intersect('foo') declare intersect: unknown[];
  @intersect('foo', 'bar', 'baz') declare intersect2: unknown[];

  // @ts-expect-error it requires a key
  @intersect()
  declare intersect3: unknown[];
}

new Foo();
