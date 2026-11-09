import { uniq } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(uniq('foo')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @uniq('foo') declare uniq: unknown[];

  @uniq('foo', 'bar') declare uniq2: unknown[];

  // @ts-expect-error it requires a key
  @uniq()
  declare uniq3: unknown[];
}

new Foo();
