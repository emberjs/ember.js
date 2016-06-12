import { template } from 'ember-template-compiler';

import { test, testModule } from 'internal-test-helpers/tests/skip-if-glimmer';

testModule('ember-htmlbars: template');

test('sets `isTop` on the provided function', function() {
  function test() { }

  let result = template(test);

  equal(result.isTop, true, 'sets isTop on the provided function');
});

test('sets `isMethod` on the provided function', function() {
  function test() { }

  let result = template(test);

  equal(result.isMethod, false, 'sets isMethod on the provided function');
});
