import { filterBy } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(filterBy('foo', 'key')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @filterBy('foo', 'key', 'value')
  declare filterBy: unknown[];

  @filterBy('foo', 'key', true)
  declare filterBy2: unknown[];

  @filterBy('foo', 'key')
  declare filterBy3: unknown[];

  // @ts-expect-error a comparison key is required
  @filterBy('foo')
  declare filterBy4: unknown[];
}

new Foo();
