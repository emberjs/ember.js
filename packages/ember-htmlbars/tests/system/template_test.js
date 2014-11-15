import template from "ember-htmlbars/system/template";

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

QUnit.module('ember-htmlbars: template');

test('sets `isTop` on the provided function', function() {
  function test() { }

  template(test);

  equal(test.isTop, true, 'sets isTop on the provided function');
});

test('sets `isMethod` on the provided function', function() {
  function test() { }

  template(test);

  equal(test.isMethod, false, 'sets isMethod on the provided function');
});

}
