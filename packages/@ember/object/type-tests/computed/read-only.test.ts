import { readOnly } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(readOnly('foo')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @readOnly('foo') readOnly: unknown;

  // @ts-expect-error Only takes one key
  @readOnly('foo', 'bar')
  readOnly2: unknown;

  // @ts-expect-error Requires a key
  @readOnly()
  readOnly3: unknown;
}

new Foo();
