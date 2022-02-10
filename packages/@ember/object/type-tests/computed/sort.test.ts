import { sort } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(sort('foo', 'bar')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  // With sortKey
  @sort('foo', 'bar') declare sort: boolean;

  // With sortDefinition
  @sort('foo', (itemA, itemB) => Number(itemA) - Number(itemB)) declare sort2: boolean;

  // With dependentKeys
  @sort('foo', ['bar', 'baz'], (itemA, itemB) => Number(itemA) - Number(itemB))
  declare sort3: boolean;

  // @ts-expect-error Requires a second parameter
  @sort('foo')
  declare sort4: boolean;

  // @ts-expect-error Requires a key
  @sort()
  declare sort5: boolean;

  // @ts-expect-error Requires a sortDefinition
  @sort('foo', ['bar', 'baz'])
  declare sort6: boolean;

  // @ts-expect-error Can't pass sortKey as third param
  @sort('foo', ['bar', 'baz'], 'sortKey')
  declare sort7: boolean;

  // @ts-expect-error Requires valid sortDefinition
  @sort('foo', () => true)
  declare sort8: boolean;
}

new Foo();
