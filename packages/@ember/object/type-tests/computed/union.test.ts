import { union } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(union('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @union('foo') declare union: unknown[];
  @union('foo', 'bar', 'baz') declare union2: unknown[];

  // @ts-expect-error it requires a key
  @union()
  declare union3: unknown[];
}

new Foo();
