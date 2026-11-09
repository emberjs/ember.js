import { empty } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(empty('foo')).toMatchTypeOf<FieldDecorator>();

class Foo {
  @empty('foo') declare empty: boolean;

  // @ts-expect-error Only takes one key
  @empty('foo', 'bar')
  declare empty2: boolean;

  // @ts-expect-error Requires a key
  @empty()
  declare empty3: boolean;
}

new Foo();
