import { lt } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';
import type { FieldDecorator } from '@ember/-internals/metal/lib/decorator-util';

expectTypeOf(lt('foo', 10)).toMatchTypeOf<FieldDecorator>();

class Foo {
  @lt('foo', 10) declare lt: boolean;

  // @ts-expect-error Requires a key
  @lt()
  declare lt2: boolean;

  // @ts-expect-error Must compare to a number
  @lt('foo', 'bar') declare lt3: boolean;
}

new Foo();
