import { uniqBy } from '@ember/object/computed';

class Foo {
  @uniqBy('foo', 'key')
  declare uniqBy: unknown[];

  // @ts-expect-error Requires a key
  @uniqBy('foo')
  declare uniqBy2: unknown[];

  // @ts-expect-error Only takes one propertyKey
  @uniqBy('foo', 'key', 'key2')
  declare uniqBy3: unknown[];
}

new Foo();
