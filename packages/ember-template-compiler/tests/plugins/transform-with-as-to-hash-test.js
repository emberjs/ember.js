import { compile } from "ember-template-compiler";

QUnit.module('ember-template-compiler: transform-with-as-to-hash');

QUnit.test('cannot use block params and keyword syntax together', function() {
  expect(1);

  throws(function() {
    compile('{{#with foo as thing as |other-thing|}}{{thing}}-{{other-thing}}{{/with}}');
  }, /You cannot use keyword/);
});
