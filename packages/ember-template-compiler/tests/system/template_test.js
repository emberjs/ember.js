import template from 'ember-template-compiler/system/template';

import isEnabled from 'ember-metal/features';
if (!isEnabled('ember-glimmer')) {
  // jscs:disable

QUnit.module('ember-htmlbars: template');

QUnit.test('sets `isTop` on the provided function', function() {
  function test() { }

  var result = template(test);

  equal(result.isTop, true, 'sets isTop on the provided function');
});

QUnit.test('sets `isMethod` on the provided function', function() {
  function test() { }

  var result = template(test);

  equal(result.isMethod, false, 'sets isMethod on the provided function');
});

}
