import { gt } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(gt('foo', 10)).toMatchTypeOf<FieldDecorator>();

class Foo {
  @gt('foo', 10) declare gt: boolean;

  // @ts-expect-error Requires a key
  @gt()
  declare gt2: boolean;

  // @ts-expect-error Must compare to a number
  @gt('foo', 'bar') declare gt3: boolean;
}

new Foo();
