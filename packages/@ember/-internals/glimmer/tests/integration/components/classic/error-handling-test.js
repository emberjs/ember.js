import { moduleFor, runTask } from 'internal-test-helpers';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { DEBUG } from '@glimmer/env';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { ClassicRenderingTestCase } from '../../../utils/classic-rendering-test-case';
import { Component as EmberComponent } from '../../../utils/helpers';
import { backtrackingMessageFor } from '../../../utils/debug-stack';

moduleFor(
  'Errors thrown during render (classic component)',
  class extends ClassicRenderingTestCase {
    ['@test it can recover resets the transaction when an error is thrown during initial render'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = class extends GlimmerComponent {
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

    ['@test the render stack of a backtracking message starts with -top-level']() {
      let middle;

      class MiddleComponent extends GlimmerComponent {
        constructor(owner, args) {
          super(owner, args);
          middle = this;
        }

        @tracked value = null;
      }

      this.owner.register(
        'component:x-middle',
        setComponentTemplate(precompileTemplate('{{this.value}}{{yield}}'), MiddleComponent)
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('inner'),
          class extends GlimmerComponent {
            constructor(owner, args) {
              super(owner, args);
              middle.value = 1;
            }
          }
        )
      );

      let expectedBacktrackingMessage = backtrackingMessageFor('value', MiddleComponent.name, {
        includeTopLevel: '-top-level',
        renderTree: ['x-middle', 'this.value'],
      });

      expectAssertion(() => {
        this.render('{{#x-middle}}{{x-inner}}{{/x-middle}}');
      }, expectedBacktrackingMessage);
    }

    ['@test it can recover resets the transaction when an error is thrown during didInsertElement'](
      assert
    ) {
      let shouldThrow = true;
      let FooBarComponent = class extends EmberComponent {
        didInsertElement() {
          super.didInsertElement(...arguments);
          if (shouldThrow) {
            throw new Error('silly mistake!');
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
      let FooBarComponent = class extends EmberComponent {
        destroy() {
          super.destroy(...arguments);
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
