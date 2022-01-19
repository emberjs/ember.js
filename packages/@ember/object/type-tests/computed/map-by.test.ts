import { mapBy } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(mapBy('foo', 'key')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @mapBy('foo', 'key')
  declare mapBy: unknown[];

  // @ts-expect-error Requires a key
  @mapBy('foo')
  declare mapBy2: unknown[];

  // @ts-expect-error Only takes one propertyKey
  @mapBy('foo', 'key', 'key2')
  declare mapBy3: unknown[];
}

new Foo();
