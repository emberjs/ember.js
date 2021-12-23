import { setDiff } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(setDiff('foo', 'bar')).toEqualTypeOf<PropertyDecorator>();

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
