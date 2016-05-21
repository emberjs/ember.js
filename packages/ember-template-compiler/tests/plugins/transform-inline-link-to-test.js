import { compile } from '../utils/helpers';

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-template-compiler: assert-no-view-and-controller-paths without legacy view support');

test('Can transform an inline {{link-to}} without error', function() {
  expect(0);

  compile(`{{link-to 'foo' 'index'}}`, {
    moduleName: 'foo/bar/baz'
  });
});
