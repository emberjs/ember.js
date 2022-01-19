import { intersect } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(intersect('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @intersect('foo') declare intersect: unknown[];
  @intersect('foo', 'bar', 'baz') declare intersect2: unknown[];

  // @ts-expect-error it requires a key
  @intersect()
  declare intersect3: unknown[];
}

new Foo();
