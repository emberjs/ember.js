import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { compile } from '../../index';

moduleFor(
  'ember-template-compiler: transform-each-in-into-each',
  class extends AbstractTestCase {
    ['@test {{#each-in}} without a positional parameter is a syntax error'](assert) {
      assert.throws(
        () => {
          compile('{{#each-in}}{{/each-in}}', { moduleName: 'foo/bar' });
        },
        (error) =>
          !(error instanceof TypeError) &&
          error.message.startsWith(
            '{{#each-in}} requires an object to be passed as its first positional parameter, did not receive any parameters'
          )
      );
    }
  }
);
