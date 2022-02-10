import { sum } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(sum('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @sum('foo') sum: unknown;

  // @ts-expect-error Only takes one key
  @sum('foo', 'bar')
  sum2: unknown;

  // @ts-expect-error Requires a key
  @sum()
  sum3: unknown;
}

new Foo();
