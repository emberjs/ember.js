import { reads } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(reads('foo')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @reads('foo') reads: unknown;

  // @ts-expect-error Only takes one key
  @reads('foo', 'bar')
  reads2: unknown;

  // @ts-expect-error Requires a key
  @reads()
  reads3: unknown;
}

new Foo();
