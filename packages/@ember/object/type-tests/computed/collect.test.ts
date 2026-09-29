import { collect } from '@ember/object/computed';

import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(collect('foo')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @collect('foo') declare collect: unknown[];
  @collect('foo', 'bar', 'baz') declare collect2: unknown[];

  // @ts-expect-error it requires a key
  @collect()
  declare collect3: unknown[];
}

new Foo();
