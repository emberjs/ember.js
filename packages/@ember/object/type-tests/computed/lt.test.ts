import { lt } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

expectTypeOf(lt('foo', 10)).toEqualTypeOf<PropertyDecorator>();

class Foo {
  @lt('foo', 10) declare lt: boolean;

  // @ts-expect-error Requires a key
  @lt()
  declare lt2: boolean;

  // @ts-expect-error Must compare to a number
  @lt('foo', 'bar') declare lt3: boolean;
}

new Foo();
