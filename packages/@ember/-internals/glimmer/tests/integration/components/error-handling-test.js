import { DEBUG } from '@glimmer/env';

import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Errors thrown during render',
  class extends RenderingTestCase {
    ['@test it can recover resets the transaction when an error is thrown during initial render'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake in init!');
          }
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      assert.throws(() => {
        this.render('{{#if this.switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', {
          switch: true,
        });
      }, /silly mistake in init/);

      assert.equal(
        this.renderer._inRenderTransaction,
        false,
        'should not be in a transaction even though an error was thrown'
      );

      this.assertText('');

      runTask(() => set(this.context, 'switch', false));

      shouldThrow = false;

      runTask(() => set(this.context, 'switch', true));

      if (DEBUG) {
        this.assertText('', 'it does not rerender after error in development');
      } else {
        this.assertText('hello', 'it rerenders after error in production');
      }
    }

    ['@skip it can recover resets the transaction when an error is thrown during rerender'](
      assert
    ) {
      let shouldThrow = false;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake in init!');
          }
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{#if this.switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', {
        switch: true,
      });

      this.assertText('hello');

      runTask(() => set(this.context, 'switch', false));

      shouldThrow = true;

      assert.throws(() => {
        runTask(() => set(this.context, 'switch', true));
      }, /silly mistake in init/);

      assert.equal(
        this.renderer._inRenderTransaction,
        false,
        'should not be in a transaction even though an error was thrown'
      );

      this.assertText('');

      runTask(() => set(this.context, 'switch', false));
      shouldThrow = false;

      runTask(() => set(this.context, 'switch', true));

      if (DEBUG) {
        this.assertText('', 'it does not rerender after error in development');
      } else {
        this.assertText('hello', 'it does rerender after error in production');
      }
    }

    ['@test it can recover resets the transaction when an error is thrown during didInsertElement'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = Component.extend({
        didInsertElement() {
          this._super(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake!');
          }
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      assert.throws(() => {
        this.render('{{#if this.switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', {
          switch: true,
        });
      }, /silly mistake/);

      assert.equal(
        this.renderer._inRenderTransaction,
        false,
        'should not be in a transaction even though an error was thrown'
      );

      this.assertText('hello');

      runTask(() => set(this.context, 'switch', false));

      this.assertText('');
    }

    ['@test it can recover resets the transaction when an error is thrown during destroy'](assert) {
      let shouldThrow = true;
      let FooBarComponent = Component.extend({
        destroy() {
          this._super(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake!');
          }
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{#if this.switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', {
        switch: true,
      });

      this.assertText('hello');

      assert.throws(() => {
        runTask(() => set(this.context, 'switch', false));
      }, /silly mistake/);

      this.assertText('');

      shouldThrow = false;
      runTask(() => set(this.context, 'switch', true));

      this.assertText('hello');
    }
  }
);
