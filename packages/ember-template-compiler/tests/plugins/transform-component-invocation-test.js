import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforms component invocation',
  class extends AbstractTestCase {
    ['@test Does not throw a compiler error for component invocations'](assert) {
      assert.expect(0);

      [
        '{{this.modal open}}',
        '{{this.modal isOpen=true}}',
        '{{#this.modal}}Woot{{/this.modal}}',
        '{{@modal open}}', // RFC#311
        '{{@modal isOpen=true}}', // RFC#311
        '{{#@modal}}Woot{{/@modal}}', // RFC#311
        '{{c.modal open}}',
        '{{c.modal isOpen=true}}',
        '{{#c.modal}}Woot{{/c.modal}}',
        '{{#my-component as |c|}}{{c name="Chad"}}{{/my-component}}', // RFC#311
        '{{#my-component as |c|}}{{c "Chad"}}{{/my-component}}', // RFC#311
        '{{#my-component as |c|}}{{#c}}{{/c}}{{/my-component}}', // RFC#311
        '<input disabled={{true}}>', // GH#15740
        '<td colspan={{3}}></td>', // GH#15217
      ].forEach((layout, i) => {
        compile(layout, { moduleName: `example-${i}` });
      });
    }
  }
);
