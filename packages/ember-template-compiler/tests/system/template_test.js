import template from "ember-template-compiler/system/template";

QUnit.module('ember-htmlbars: template');

QUnit.test('sets `isTop` on the provided function', function() {
  function test() { }

  template(test);

  equal(test.isTop, true, 'sets isTop on the provided function');
});

QUnit.test('sets `isMethod` on the provided function', function() {
  function test() { }

  template(test);

  equal(test.isMethod, false, 'sets isMethod on the provided function');
});
