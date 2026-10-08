import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { Component as EmberComponent } from '../../../utils/helpers';

moduleFor(
  'Errors thrown during render (classic component)',
  class extends RenderingTestCase {
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
