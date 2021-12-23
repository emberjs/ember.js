import { or } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(or('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @or('foo') or: unknown;

  @or('foo', 'bar', 'baz', 'qux') or2: unknown;

  // @ts-expect-error Requires a key
  @or()
  or3: unknown;

  // @ts-expect-error Arguments must be keys
  @or('foo', 1)
  or4: unknown;
}

new Foo();
