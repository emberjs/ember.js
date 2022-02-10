import { bool } from '@ember/object/computed';

import { expectTypeOf } from 'expect-type';

expectTypeOf(bool('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @bool('foo') declare bool: boolean;

  // @ts-expect-error Requires a key
  @bool()
  declare bool2: boolean;

  // @ts-expect-error It only takes one key
  @bool('foo', 'bar')
  declare bool3: boolean;
}

new Foo();
