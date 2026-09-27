import { setDiff } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(setDiff('foo', 'bar')).toEqualTypeOf<FieldDecorator>();

class Foo {
  @setDiff('foo', 'bar') declare setDiff: boolean;

  // @ts-expect-error Requires a second key parameter
  @setDiff('foo')
  declare setDiff2: boolean;

  // @ts-expect-error Requires a key
  @setDiff()
  declare setDiff3: boolean;
}

new Foo();
