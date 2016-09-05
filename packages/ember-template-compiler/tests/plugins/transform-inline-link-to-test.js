import { compile } from '../../index';

QUnit.module('ember-template-compiler: assert-no-view-and-controller-paths without legacy view support');

QUnit.test('Can transform an inline {{link-to}} without error', function() {
  expect(0);

  compile(`{{link-to 'foo' 'index'}}`, {
    moduleName: 'foo/bar/baz'
  });
});
