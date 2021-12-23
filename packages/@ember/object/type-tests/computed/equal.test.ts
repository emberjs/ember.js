import { equal } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(equal('foo', 'bar')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @equal('foo', 'bar') declare equal: boolean;

  // @ts-expect-error Requires a second value parameter
  @equal('foo')
  declare equal2: boolean;

  // @ts-expect-error Requires a key
  @equal()
  declare equal3: boolean;
}

new Foo();
