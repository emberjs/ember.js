import { uniq } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(uniq('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @uniq('foo') declare uniq: unknown[];

  @uniq('foo', 'bar') declare uniq2: unknown[];

  // @ts-expect-error it requires a key
  @uniq()
  declare uniq3: unknown[];
}

new Foo();
