import { gte } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(gte('foo', 10)).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @gte('foo', 10) declare gte: boolean;

  // @ts-expect-error Requires a key
  @gte()
  declare gte2: boolean;

  // @ts-expect-error Must compare to a number
  @gte('foo', 'bar') declare gte3: boolean;
}

new Foo();
