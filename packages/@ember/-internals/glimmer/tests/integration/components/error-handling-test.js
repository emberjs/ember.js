import { DEBUG } from '@glimmer/env';

import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Errors thrown during render',
  class extends RenderingTestCase {
    ['@test using an unresolved variable in argument position produces a helpful error (GH#21035)'](
      assert
    ) {
      // In non-strict mode, {{range}} (without this.) is a free variable.
      // Ember should produce a helpful error suggesting this.range — not
      // "Cannot read properties of undefined (reading 'Symbol(TAG_COMPUTE)')".
      this.registerComponent('my-component', {
        ComponentClass: class extends Component {},
        template: '{{@value}}',
      });

      assert.throws(() => {
        this.render('<MyComponent @value={{range}} />', {
          range: 'hello',
        });
      }, /range was not in scope/);
    }

    ['@test using an unresolved variable in content position does not produce a cryptic TAG_COMPUTE error (GH#21035)'](
      assert
    ) {
      // {{range}} in content position when range is not in scope should
      // either render empty or produce a helpful error — not a cryptic
      // TAG_COMPUTE error.
      this.render('{{range}}', { range: 'hello' });
      // If this renders, it should be empty (range is a free variable, not this.range)
      // The important thing is no TAG_COMPUTE error
      assert.ok(true, 'did not throw a cryptic TAG_COMPUTE error');
    }

    ['@test it can recover resets the transaction when an error is thrown during initial render'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake in init!');
          }
        }
      };

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
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake in init!');
          }
        }
      };

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
      let FooBarComponent = class extends Component {
        didInsertElement() {
          super.didInsertElement(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake!');
          }
        }
      };

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
      let FooBarComponent = class extends Component {
        destroy() {
          super.destroy(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake!');
          }
        }
      };

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
