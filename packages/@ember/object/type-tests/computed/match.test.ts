import { match } from '@ember/object/computed';

class Foo {
  @match('foo', /^foo$/) declare match: boolean;

  // @ts-expect-error Requires a second value parameter
  @match('foo')
  declare match2: boolean;

  // @ts-expect-error Requires a second parameter to be a regex
  @match('foo', 'bar')
  declare match3: boolean;

  // @ts-expect-error Requires a key
  @match()
  declare match4: boolean;
}

new Foo();
