import { readOnly } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(readOnly('foo')).toEqualTypeOf<PropertyDecorator>();

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
