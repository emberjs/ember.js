import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from '@ember/-internals/metal';
import { Component } from '../../utils/helpers';
import { computed } from '@ember/-internals/metal';
import { EMBER_BASIC_TEMPLATE_HELPERS } from '@ember/canary-features';

if (EMBER_BASIC_TEMPLATE_HELPERS) {
  moduleFor(
    'Helpers test: {{or}}',
    class extends RenderingTest {
      ['@test returns the first truthy argument']() {
        this.render(`{{or false 0 "foo"}}`);
        this.assertText('foo');
      }

      ['@test if all arguments are falsy, it return the last argument']() {
        this.render(`{{or false "" 0}}`);
        this.assertText('0');
      }

      ['@test it updates for bound arguments']() {
        this.render(`{{or first second third}}`, { first: 1, second: true, third: 'foo' });

        this.assertText('1');

        this.runTask(() => this.rerender());

        this.assertText('1');

        this.runTask(() => set(this.context, 'first', false));

        this.assertText('true');

        this.runTask(() => set(this.context, 'second', 0));

        this.assertText('foo');

        this.runTask(() => set(this.context, 'third', ''));

        this.assertText('');
      }

      ['@test it can be used as a sub-expression']() {
        this.render(`{{if (or first second) "yes" "no"}}`, { first: 1, second: 2 });

        this.assertText('yes');

        this.runTask(() => this.rerender());

        this.assertText('yes');

        this.runTask(() => set(this.context, 'first', false));

        this.assertText('yes');

        this.runTask(() => set(this.context, 'second', 0));

        this.assertText('no');
      }

      ['@test once if finds the first truthy argument, the following arguments are not evaluated']() {
        let didInvokeFirst = false;
        let didInvokeSecond = false;
        let didInvokeThird = false;
        let FooBarComponent = Component.extend({
          first: computed(function() {
            didInvokeFirst = true;
            return true;
          }),
          second: computed(function() {
            didInvokeSecond = true;
            return false;
          }),
          third: computed(function() {
            didInvokeThird = true;
            return 'foo§';
          }),
        });

        this.registerComponent('foo-bar', {
          ComponentClass: FooBarComponent,
          template: `{{or first second third}}`,
        });

        this.render(`{{foo-bar}}`, {});

        this.assertText('true');

        this.runTask(() => this.rerender());

        this.assertText('true');

        this.assert.ok(didInvokeFirst, 'the `first` property was accessed');
        this.assert.notOk(didInvokeSecond, 'the `second` property was accessed');
        this.assert.notOk(didInvokeThird, "the `third` property wasn't accessed");
      }
    }
  );
}
