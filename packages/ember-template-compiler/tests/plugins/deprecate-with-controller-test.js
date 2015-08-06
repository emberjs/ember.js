import { compile } from 'ember-template-compiler';

QUnit.module('ember-template-compiler: deprecate-with-controller');

QUnit.test('Using `{{with}}` with `controller` hash argument provides a deprecation', function() {
  expect(1);

  expectDeprecation(function() {
    compile('{{#with controller="foo"}}{{/with}}', {
      moduleName: 'foo/bar/baz'
    });
  }, `Using the {{with}} helper with a \`controller\` specified ('foo/bar/baz' @ L1:C0) is deprecated and will be removed in 2.0.0.`);
});
