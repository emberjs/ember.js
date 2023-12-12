import { expectTypeOf } from 'expect-type';

import { action } from '@ember/object';
import type { ExtendedMethodDecorator } from '@ember/-internals/metal/lib/decorator';

expectTypeOf(action).toMatchTypeOf<ExtendedMethodDecorator>();

class Foo {
  // @ts-expect-error action is a method decorator
  @action
  bar!: string;

  @action
  foo() {}
}

new Foo();
