import { DEBUG } from '@glimmer/env';

import { moduleFor, RenderingTestCase, runTask, defineSimpleModifier } from 'internal-test-helpers';

import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';

import Component from '@glimmer/component';

moduleFor(
  'Errors thrown during render',
  class extends RenderingTestCase {
    ['@test it can recover resets the transaction when an error is thrown during initial render'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = class extends Component {
        constructor(owner, args) {
          super(owner, args);
          if (shouldThrow) {
            throw new Error('silly mistake in init!');
          }
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

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
        constructor(owner, args) {
          super(owner, args);
          if (shouldThrow) {
            throw new Error('silly mistake in init!');
          }
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

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

    ['@test it can recover resets the transaction when an error is thrown during modifier installation'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = class extends Component {
        inserted = defineSimpleModifier(() => {
          if (shouldThrow) {
            throw new Error('silly mistake!');
          }
        });
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div {{this.inserted}}>hello</div>'),
          FooBarComponent
        )
      );

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
        willDestroy() {
          super.willDestroy(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake!');
          }
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

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
