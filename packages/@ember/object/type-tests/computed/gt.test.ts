import { gt } from '@ember/object/computed';

class Foo {
  @gt('foo', 10) declare gt: boolean;

  // @ts-expect-error Requires a key
  @gt()
  declare gt2: boolean;

  // @ts-expect-error Must compare to a number
  @gt('foo', 'bar') declare gt3: boolean;
}

new Foo();
