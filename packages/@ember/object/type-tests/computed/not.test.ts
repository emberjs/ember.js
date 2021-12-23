import { not } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(not('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @not('foo') not: unknown;

  // @ts-expect-error Only takes one key
  @not('foo', 'bar')
  not2: unknown;

  // @ts-expect-error Requires a key
  @not()
  not3: unknown;
}

new Foo();
