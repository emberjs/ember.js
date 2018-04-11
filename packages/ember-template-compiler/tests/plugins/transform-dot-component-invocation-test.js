import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: transforms dot component invocation',
  class extends AbstractTestCase {
    ['@test Does not throw a compiler error for path components'](assert) {
      assert.expect(0);

      [
        '{{this.modal open}}',
        '{{this.modal isOpen=true}}',
        '{{#this.modal}}Woot{{/this.modal}}',
        '{{c.modal open}}',
        '{{c.modal isOpen=true}}',
        '{{#c.modal}}Woot{{/c.modal}}',
        '{{#my-component as |c|}}{{c.a name="Chad"}}{{/my-component}}',
        '{{#my-component as |c|}}{{c.a "Chad"}}{{/my-component}}',
        '{{#my-component as |c|}}{{#c.a}}{{/c.a}}{{/my-component}}',
        '<input disabled={{true}}>', // GH#15740
        '<td colspan={{3}}></td>', // GH#15217
      ].forEach((layout, i) => {
        compile(layout, { moduleName: `example-${i}` });
      });
    }
  }
);
