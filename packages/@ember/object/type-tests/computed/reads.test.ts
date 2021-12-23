import { reads } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(reads('foo')).toEqualTypeOf<PropertyDecorator>();

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
