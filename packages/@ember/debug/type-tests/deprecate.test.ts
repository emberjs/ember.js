import { deprecate } from '@ember/debug';
import { expectTypeOf } from 'expect-type';

let str: unknown;
deprecate('Must pass a string', typeof str === 'string');

// Always deprecated
deprecate('This code path should never be run');

expectTypeOf(deprecate('foo')).toEqualTypeOf<void>();

deprecate('foo', true, {
  id: 'foo',
  until: '5.0.0',
  url: 'http://example.com/deprecation',
  for: 'my-module',
  since: { available: '1.0.0', enabled: '1.0.0' },
});

deprecate('foo', true, {
  id: 'foo',
  until: '5.0.0',
  for: 'my-module',
  since: { available: '1.0.0', enabled: '1.0.0' },
});

deprecate('foo', true, {
  id: 'foo',
  until: '5.0.0',
  for: 'my-module',
  since: { available: '1.0.0' },
});

// @ts-expect-error requires id
deprecate('foo', true, {
  until: '5.0.0',
  for: 'my-module',
  since: { available: '1.0.0', enabled: '1.0.0' },
});

// @ts-expect-error requires until
deprecate('foo', true, {
  id: 'foo',
  for: 'my-module',
  since: { available: '1.0.0', enabled: '1.0.0' },
});

// @ts-expect-error requires for
deprecate('foo', true, {
  id: 'foo',
  until: '5.0.0',
  since: { available: '1.0.0', enabled: '1.0.0' },
});

// @ts-expect-error requires since
deprecate('foo', true, {
  id: 'foo',
  until: '5.0.0',
  for: 'my-module',
});

deprecate('foo', true, {
  id: 'foo',
  until: '5.0.0',
  // @ts-expect-error requires 'available' if 'enabled' present
  since: { enabled: '1.0.0' },
});

// @ts-expect-error inverted order
deprecate(typeof str === 'string', 'Must pass a string');
