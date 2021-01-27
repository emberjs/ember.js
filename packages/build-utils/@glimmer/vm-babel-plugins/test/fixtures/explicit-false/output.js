import { assert, deprecate } from '@glimmer/global-context';

if (
  false
  /* DEBUG */
) {
  console.log('foo');
}

false &&
  assert(foo, 'TESTING 123', {
    id: 'test',
  });
false &&
  !bar &&
  deprecate('TESTING 123', bar, {
    id: 'test',
  });
