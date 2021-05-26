import { expectTypeOf } from 'expect-type';

import { action } from '@ember/object';

expectTypeOf(action).toEqualTypeOf<MethodDecorator>();

class Foo {
  // @ts-expect-error action is a method decorator
  @action
  bar!: string;

  @action
  foo() {}
}

new Foo();
