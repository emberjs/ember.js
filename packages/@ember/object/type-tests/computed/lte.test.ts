import { lte } from '@ember/object/computed';

class Foo {
  @lte('foo', 10) declare lte: boolean;

  // @ts-expect-error Requires a key
  @lte()
  declare lte2: boolean;

  // @ts-expect-error Must compare to a number
  @lte('foo', 'bar') declare lte3: boolean;
}

new Foo();
