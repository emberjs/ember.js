import { compile } from '../utils/helpers';

QUnit.module('transform-old-class-bindings-syntax-test');

QUnit.test('valid `classNameBindings`', function() {
  compile('{{#link-to "index" classNameBindings=":valid isBig:big isOpen:open:closed"}}go{{/link-to}}', {
    moduleName: 'baz/foo-bar'
  });

  ok(true, 'should not produce an assert');
});

QUnit.test('invalid `classNameBindings`', function() {
  expectAssertion(() => {
    compile('{{#link-to "index" classNameBindings=":valid isBig:big isOpen:open:closed invalid"}}go{{/link-to}}', {
      moduleName: 'baz/foo-bar'
    });
  }, `'invalid' is not a valid classNameBinding. ('baz/foo-bar' @ L1:C19) `);
});
