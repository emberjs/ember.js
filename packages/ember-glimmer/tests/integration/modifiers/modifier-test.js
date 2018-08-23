import { EMBER_ELEMENT_MODIFIERS } from '@ember/canary-features';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Modifier } from '../../utils/helpers';
import { set, setProperties } from 'ember-metal';

if (EMBER_ELEMENT_MODIFIERS) {
  moduleFor(
    'Public modifiers',
    class extends RenderingTest {
      '@test life cycle hooks'(assert) {
        let hooks = [];
        this.registerModifier(
          'test',
          Modifier.extend({
            didInsertElement() {
              hooks.push('didInsertElement');
            },

            didUpdate() {
              hooks.push(`didUpdate`);
            },

            willDestroyElement() {
              hooks.push('willDestroyElement');
            },
          })
        );

        this.render('{{#if thing}}<div {{test a}}></div>{{/if}}', { thing: true, a: 'a' });
        assert.deepEqual(hooks, ['didInsertElement']);

        this.runTask(() => set(this.context, 'a', 'b'));

        assert.deepEqual(hooks, ['didInsertElement', 'didUpdate']);

        this.runTask(() => set(this.context, 'thing', false));

        assert.deepEqual(hooks, ['didInsertElement', 'didUpdate', 'willDestroyElement']);
      }

      '@test installs the element'(assert) {
        assert.expect(2);
        let installed;
        this.registerModifier(
          'test',
          Modifier.extend({
            didInsertElement() {
              installed = this.element;
              assert.ok(this.element);
            },
          })
        );

        this.render('<div {{test foo}}></div>');
        assert.equal(this.element.firstChild, installed);
      }

      '@test positional params'(assert) {
        assert.expect(6);

        this.registerModifier(
          'test',
          Modifier.extend({
            didInsertElement([a, b, c]) {
              assert.equal(a, 'a');
              assert.equal(b, 'b');
              assert.equal(c, 'c');
            },

            didUpdate([d, e, f]) {
              assert.equal(d, 'd');
              assert.equal(e, 'e');
              assert.equal(f, 'f');
            },
          })
        );

        this.render('<div {{test foo bar baz}}></div>', { foo: 'a', bar: 'b', baz: 'c' });
        this.runTask(() => setProperties(this.context, { foo: 'd', bar: 'e', baz: 'f' }));
      }

      '@test named params'(assert) {
        assert.expect(6);

        this.registerModifier(
          'test',
          Modifier.extend({
            didInsertElement(_params, { foo, bar, baz }) {
              assert.equal(foo, 'a');
              assert.equal(bar, 'b');
              assert.equal(baz, 'c');
            },

            didUpdate(_params, { foo, bar, baz }) {
              assert.equal(foo, 'd');
              assert.equal(bar, 'e');
              assert.equal(baz, 'f');
            },
          })
        );

        this.render('<div {{test foo=foo bar=bar baz=baz}}></div>', {
          foo: 'a',
          bar: 'b',
          baz: 'c',
        });
        this.runTask(() => setProperties(this.context, { foo: 'd', bar: 'e', baz: 'f' }));
      }
    }
  );
}
