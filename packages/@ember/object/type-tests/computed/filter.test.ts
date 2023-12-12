import type EmberArray from '@ember/array';
import { filter } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(filter('foo', (item: unknown) => Boolean(item))).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @filter('foo', (item: unknown) => Boolean(item))
  declare filter: unknown[];

  @filter('foo', (item: unknown, index: number, array: unknown[] | EmberArray<unknown>) => {
    let value;
    if (Array.isArray(array)) {
      value = array[index];
    } else {
      value = array.objectAt(index);
    }
    return item === value;
  })
  declare filter2: unknown[];

  @filter('foo', ['baz', 'qux'], (item: unknown) => Boolean(item))
  declare filter3: unknown[];

  // @ts-expect-error a callback is required
  @filter('foo')
  declare filter4: unknown[];

  // @ts-expect-error a callback is required
  @filter('foo', ['baz', 'qux'])
  declare filter5: unknown[];

  // @ts-expect-error arguments are required
  @filter()
  declare filter6: unknown[];
}

new Foo();
