import { empty } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(empty('foo')).toEqualTypeOf<PropertyDecorator>();

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
