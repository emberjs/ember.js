import { compile } from '../utils/helpers';

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-template-compiler: transform-input-on');

test('Using `action` without `on` provides a deprecation', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{input action="foo"}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using '{{input action="foo"}}' ('foo/bar/baz' @ L1:C0) is deprecated. Please use '{{input enter="foo"}}' instead.`);
});

test('Using `action` with `on` provides a deprecation', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{input on="focus-in" action="foo"}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using '{{input on="focus-in" action="foo"}}' ('foo/bar/baz' @ L1:C0) is deprecated. Please use '{{input focus-in="foo"}}' instead.`);
});

test('Using `on=\'keyPress\'` does not clobber `keyPress`', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{input on="keyPress" action="foo"}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using '{{input on="keyPress" action="foo"}}' ('foo/bar/baz' @ L1:C0) is deprecated. Please use '{{input key-press="foo"}}' instead.`);
});

test('Using `on=\'foo\'` without `action=\'asdf\'` raises specific deprecation', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{input on="asdf"}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using '{{input on="asdf" ...}}' without specifying an action ('foo/bar/baz' @ L1:C0) will do nothing.`);
});
