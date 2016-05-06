import { compile } from 'ember-template-compiler';
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-template-compiler: deprecate-render-block');

test('Using `render` with a block throws an error', function() {
  expect(1);

  let expectedMessage = `Usage of \`render\` in block form is unsupported ('baz/foo-bar' @ L1:C0) .`;

  throws(function() {
    compile('{{#render "foo-bar"}}{{/render}}', {
      moduleName: 'baz/foo-bar'
    });
  }, expectedMessage);
});
