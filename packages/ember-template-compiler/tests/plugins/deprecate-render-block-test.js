import { compile } from 'ember-template-compiler';
import isEnabled from 'ember-metal/features';

if (!isEnabled('ember-glimmer')) {
  // jscs:disable

  QUnit.module('ember-template-compiler: deprecate-render-block');

  QUnit.test('Using `render` with a block throws an error', function() {
    expect(1);

    let expectedMessage = `Usage of \`render\` in block form is unsupported ('baz/foo-bar' @ L1:C0) .`;

    throws(function() {
      compile('{{#render "foo-bar"}}{{/render}}', {
        moduleName: 'baz/foo-bar'
      });
    }, expectedMessage);
  });
}
