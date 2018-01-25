import { set } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { moduleFor, RenderingTest } from '../../utils/test-case';

moduleFor('Errors thrown during render', class extends RenderingTest {
  ['@test it can recover resets the transaction when an error is thrown during initial render'](assert) {
    let shouldThrow = true;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        if (shouldThrow) {
          throw new Error('silly mistake in init!');
        }
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    assert.throws(() => {
      this.render('{{#if switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', { switch: true });
    }, /silly mistake in init/);

    assert.equal(this.env.inTransaction, false, 'should not be in a transaction even though an error was thrown');

    this.assertText('');

    this.runTask(() => set(this.context, 'switch', false));

    shouldThrow = false;

    this.runTask(() => set(this.context, 'switch', true));

    this.assertText('hello');
  }

  ['@test it can recover resets the transaction when an error is thrown during rerender'](assert) {
    let shouldThrow = false;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        if (shouldThrow) {
          throw new Error('silly mistake in init!');
        }
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{#if switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', { switch: true });

    this.assertText('hello');

    this.runTask(() => set(this.context, 'switch', false));

    shouldThrow = true;

    assert.throws(() => {
      this.runTask(() => set(this.context, 'switch', true));
    }, /silly mistake in init/);

    assert.equal(this.env.inTransaction, false, 'should not be in a transaction even though an error was thrown');

    this.assertText('');

    this.runTask(() => set(this.context, 'switch', false));
    shouldThrow = false;

    this.runTask(() => set(this.context, 'switch', true));

    this.assertText('hello');
  }
});
