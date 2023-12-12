import { map } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(map('foo', (item: unknown) => Boolean(item))).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @map('foo', (item: unknown) => Boolean(item))
  declare map: unknown[];

  @map('foo', (_item: unknown, index: number) => index > 0)
  declare map2: unknown[];

  @map('foo', ['baz', 'qux'], (item: unknown) => Boolean(item))
  declare map3: unknown[];

  // @ts-expect-error a callback is required
  @map('foo')
  declare map4: unknown[];

  // @ts-expect-error a callback is required
  @map('foo', ['baz', 'qux'])
  declare map5: unknown[];

  // @ts-expect-error arguments are required
  @map()
  declare map6: unknown[];

  // @ts-expect-error doesn't receive an array property
  @map('foo', (_item: unknown, index: number, array: unknown[]) => item === array[index])
  declare map7: unknown[];
}

new Foo();
