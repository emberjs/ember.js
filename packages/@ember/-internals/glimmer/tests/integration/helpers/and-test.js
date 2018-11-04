import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from '@ember/-internals/metal';
import { Component } from '../../utils/helpers';
import { computed } from '@ember/-internals/metal';

moduleFor(
  'Helpers test: {{and}}',
  class extends RenderingTest {
    ['@test if all arguments are truthy, it returns the last argument']() {
      this.render(`{{and 2 1 true "foo"}}`);
      this.assertText('foo');
    }

    ['@test if any argument is falsy, it return the first falsy argument']() {
      this.render(`{{and "foo" 0 1}}`);
      this.assertText('0');
    }

    ['@test it updates for bound arguments']() {
      this.render(`{{and first second third}}`, { first: 1, second: true, third: 'foo' });

      this.assertText('foo');

      this.runTask(() => this.rerender());

      this.assertText('foo');

      this.runTask(() => set(this.context, 'third', 3));

      this.assertText('3');

      this.runTask(() => set(this.context, 'second', false));

      this.assertText('false');

      this.runTask(() => set(this.context, 'first', 0));

      this.assertText('0');
    }

    ['@test it can be used as a sub-expression']() {
      this.render(`{{if (and first second) "yes" "no"}}`, { first: 1, second: 2 });

      this.assertText('yes');

      this.runTask(() => this.rerender());

      this.assertText('yes');

      this.runTask(() => set(this.context, 'second', false));

      this.assertText('no');

      this.runTask(() => set(this.context, 'first', 0));

      this.assertText('no');

      this.runTask(() => {
        set(this.context, 'first', 'foo');
        set(this.context, 'second', 'bar');
      });

      this.assertText('yes');
    }

    ['@test once if finds the first falsy argument, the following arguments are not evaluated']() {
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
        template: `{{and first second third}}`,
      });

      this.render(`{{foo-bar}}`, {});

      this.assertText('false');

      this.runTask(() => this.rerender());

      this.assertText('false');

      this.assert.ok(didInvokeFirst, 'the `first` property was accessed');
      this.assert.ok(didInvokeSecond, 'the `second` property was accessed');
      this.assert.notOk(didInvokeThird, "the `third` property wasn't accessed");
    }
  }
);
