import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES } from '@ember/canary-features';

if (!EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES) {
  moduleFor(
    'ember-template-compiler: assert-modifiers-not-in-components',
    class extends AbstractTestCase {
      [`@test modifiers are not allowed in components`]() {
        expectAssertion(() => {
          compile(`<TheFoo {{bar "something" foo="else"}}/>`, {
            moduleName: 'the-foo',
          });
        }, `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ('the-foo' @ L1:C0) `);

        expectAssertion(() => {
          compile(`<this.foo {{bar "something" foo="else"}}></this.foo>`, {
            moduleName: 'the-foo',
          });
        }, `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ('the-foo' @ L1:C0) `);

        expectAssertion(() => {
          compile(`<api.foo {{bar "something" foo="else"}}></api.foo>`, {
            moduleName: 'the-foo',
          });
        }, `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ('the-foo' @ L1:C0) `);

        expectAssertion(() => {
          compile(`<@foo {{bar "something" foo="else"}}></@foo>`, {
            moduleName: 'the-foo',
          });
        }, `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ('the-foo' @ L1:C0) `);

        expectAssertion(() => {
          compile(
            `{{#let this.foo as |local|}}<local {{bar "something" foo="else"}}></local>{{/let}}`,
            {
              moduleName: 'the-foo',
            }
          );
        }, `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ('the-foo' @ L1:C28) `);

        expectAssertion(() => {
          compile(`<Parent as |local|><local {{bar "something" foo="else"}}></local></Parent>`, {
            moduleName: 'the-foo',
          });
        }, `Passing modifiers to components require the "ember-glimmer-forward-modifiers-with-splattributes" canary feature, which has not been stabilized yet. See RFC #435 for details. ('the-foo' @ L1:C19) `);
      }
    }
  );
}
