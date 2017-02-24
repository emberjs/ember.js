import { compile } from '../../index';

QUnit.module('ember-template-compiler: transforms dot component invocation');

QUnit.test('Does not throw a compiler error for path components', function(assert) {
  assert.expect(1);

  [
    '{{this.modal open}}',
    '{{this.modal isOpen=true}}',
    '{{#this.modal}}Woot{{/this.modal}}',
    '{{c.modal open}}',
    '{{c.modal isOpen=true}}',
    '{{#c.modal}}Woot{{/c.modal}}',
    '{{#my-component as |c|}}{{c.a name="Chad"}}{{/my-component}}',
    '{{#my-component as |c|}}{{c.a "Chad"}}{{/my-component}}',
    '{{#my-component as |c|}}{{#c.a}}{{/c.a}}{{/my-component}}'
  ].forEach((layout, i) => {
    compile(layout, { moduleName: `example-${i}` });
  });

  assert.ok(true);
});
