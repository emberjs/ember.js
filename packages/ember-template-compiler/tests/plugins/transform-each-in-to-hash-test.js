import { compile } from "ember-template-compiler";

QUnit.module('ember-template-compiler: transform-each-in-to-hash');

QUnit.test('cannot use block params and keyword syntax together', function() {
  expect(1);

  throws(function() {
    compile('{{#each thing in controller as |other-thing|}}{{thing}}-{{other-thing}}{{/each}}', true);
  }, /You cannot use keyword \(`{{each foo in bar}}`\) and block params \(`{{each bar as \|foo\|}}`\) at the same time\./);
});
