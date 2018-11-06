import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from '@ember/-internals/metal';
import { Component } from '../../utils/helpers';
import { computed } from '@ember/-internals/metal';
import { EMBER_BASIC_TEMPLATE_HELPERS } from '@ember/canary-features';

if (EMBER_BASIC_TEMPLATE_HELPERS) {
  moduleFor(
    'Helpers test: {{lt}}',
    class extends RenderingTest {
      ['@test returns false when the first static argument is bigger than the second one']() {
        this.render(`{{lt 2 1}}`);
        this.assertText('false');
      }

      ['@test returns true when the first static argument is not bigger than the second one']() {
        this.render(`{{lt 0 1}}`);
        this.assertText('true');
      }

      ['@test returns false when both arguments are the same']() {
        this.render(`{{lt 1 1}}`);
        this.assertText('false');
      }

      ['@test it updates for bound arguments']() {
        this.render(`{{lt left right}}`, { left: 1, right: 2 });

        this.assertText('true');

        this.runTask(() => this.rerender());

        this.assertText('true');

        this.runTask(() => set(this.context, 'left', 3));

        this.assertText('false');

        this.runTask(() => set(this.context, 'right', 4));

        this.assertText('true');

        this.runTask(() => set(this.context, 'left', 5));

        this.assertText('false');

        this.runTask(() => set(this.context, 'right', 5));

        this.assertText('false');

        this.runTask(() => set(this.context, 'right', null));

        this.assertText('false');

        this.runTask(() => set(this.context, 'left', -1));

        this.assertText('true');
      }

      ['@test it can be used as a sub-expression']() {
        this.render(`{{if (lt left right) "yes" "no"}}`, { left: 1, right: 2 });

        this.assertText('yes');

        this.runTask(() => this.rerender());

        this.assertText('yes');

        this.runTask(() => set(this.context, 'left', 3));

        this.assertText('no');

        this.runTask(() => set(this.context, 'right', 4));

        this.assertText('yes');

        this.runTask(() => {
          set(this.context, 'left', 5);
          set(this.context, 'right', 0);
        });

        this.assertText('no');
      }

      ['@test of the first argument is undefined, it never pulls the second argument']() {
        let didInvokeLeft = false;
        let didInvokeRight = false;
        let FooBarComponent = Component.extend({
          left: computed(function() {
            didInvokeLeft = true;
            return undefined;
          }),
          right: computed(function() {
            didInvokeRight = true;
            return 5;
          }),
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: `{{lt left right}}`,
        });

        this.render(`{{foo-bar}}`, {});

        this.assertText('false');

        this.runTask(() => this.rerender());

        this.assertText('false');

        this.assert.ok(didInvokeLeft, 'the `left` property was accessed');
        this.assert.notOk(didInvokeRight, "the `right` property wasn't accessed");
      }

      ['@test of the first argument is null, it never pulls the second argument']() {
        let didInvokeLeft = false;
        let didInvokeRight = false;
        let FooBarComponent = Component.extend({
          left: computed(function() {
            didInvokeLeft = true;
            return null;
          }),
          right: computed(function() {
            didInvokeRight = true;
            return 5;
          }),
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: `{{lt left right}}`,
        });

        this.render(`{{foo-bar}}`, {});

        this.assertText('false');

        this.runTask(() => this.rerender());

        this.assertText('false');

        this.assert.ok(didInvokeLeft, 'the `left` property was accessed');
        this.assert.notOk(didInvokeRight, "the `right` property wasn't accessed");
      }
    }
  );
}
