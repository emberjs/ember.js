import { deprecatingAlias } from '@ember/object/computed';

class Foo {
  @deprecatingAlias('foo', {
    id: 'test',
    until: '4.0.0',
    for: 'testing',
    since: { enabled: '3.0.0' },
  })
  declare deprecatingAlias: unknown;

  // @ts-expect-error Requires deprecation options
  @deprecatingAlias('foo')
  declare deprecatingAlias2: unknown;

  // @ts-expect-error Requires valid deprecation options
  @deprecatingAlias('foo', { id: 'test' })
  declare deprecatingAlias3: unknown;
}

new Foo();
