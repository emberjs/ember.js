import template from 'ember-htmlbars-template-compiler/system/template';

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-htmlbars: template');

test('sets `isTop` on the provided function', function() {
  function test() { }

  var result = template(test);

  equal(result.isTop, true, 'sets isTop on the provided function');
});

test('sets `isMethod` on the provided function', function() {
  function test() { }

  var result = template(test);

  equal(result.isMethod, false, 'sets isMethod on the provided function');
});
