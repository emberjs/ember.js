import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const EVENTS = [
  'insert-newline',
  'enter',
  'escape-press',
  'focus-in',
  'focus-out',
  'key-press',
  'key-up',
  'key-down',
];

class DeprecateSendActionTest extends AbstractTestCase {}

EVENTS.forEach(function(e) {
  DeprecateSendActionTest.prototype[
    `@test Using \`{{input ${e}="actionName"}}\` provides a deprecation`
  ] = function() {
    let expectedMessage = `Please refactor \`{{input ${e}="foo-bar"}}\` to \`{{input ${e}=(action "foo-bar")}}\. ('baz/foo-bar' @ L1:C0) `;

    expectDeprecation(() => {
      compile(`{{input ${e}="foo-bar"}}`, { moduleName: 'baz/foo-bar' });
    }, expectedMessage);
  };
});

moduleFor('ember-template-compiler: deprecate-send-action', DeprecateSendActionTest);
