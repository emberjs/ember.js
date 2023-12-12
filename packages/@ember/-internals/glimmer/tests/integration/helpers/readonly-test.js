import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

import { set, get } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Helpers test: {{readonly}}',
  class extends RenderingTestCase {
    ['@test {{readonly}} of a path should work']() {
      let component;

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          didInsertElement() {
            component = this;
          },
        }),
        template: '{{this.value}}',
      });

      this.render('{{foo-bar value=(readonly this.val)}}', {
        val: 12,
      });

      this.assertText('12');

      this.assertStableRerender();

      runTask(() => set(component, 'value', 13));
      this.assert.notOk(component.attrs.value.update);

      this.assertText('13', 'local property is updated');
      this.assert.equal(get(this.context, 'val'), 12, 'upstream attribute is not updated');

      // No U-R
    }

    '@test passing an action to {{readonly}} avoids mutable cell wrapping'(assert) {
      assert.expect(4);
      let outer, inner;

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            inner = this;
          },
        }),
      });

      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            outer = this;
          },
        }),
        template: '{{x-inner onClick=(readonly this.onClick)}}',
      });

      this.render('{{x-outer onClick=(action this.doIt)}}', {
        doIt() {
          assert.ok(true, 'action was called');
        },
      });

      assert.equal(
        typeof outer.attrs.onClick,
        'function',
        'function itself is present in outer component attrs'
      );
      outer.attrs.onClick();

      assert.equal(
        typeof inner.attrs.onClick,
        'function',
        'function itself is present in inner component attrs'
      );
      inner.attrs.onClick();
    }

    '@test updating a {{readonly}} property from above works'(assert) {
      let component;

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            component = this;
          },
        }),
        template: '{{this.value}}',
      });

      this.render('{{foo-bar value=(readonly this.thing)}}', {
        thing: 'initial',
      });

      this.assertText('initial');

      this.assertStableRerender();

      assert.strictEqual(component.attrs.value, 'initial', 'no mutable cell');
      assert.strictEqual(get(component, 'value'), 'initial', 'no mutable cell');
      assert.strictEqual(this.context.thing, 'initial');

      runTask(() => set(this.context, 'thing', 'updated!'));

      this.assertText('updated!');
      assert.strictEqual(component.attrs.value, 'updated!', 'passed down value was set in attrs');
      assert.strictEqual(get(component, 'value'), 'updated!', 'passed down value was set');

      runTask(() => set(this.context, 'thing', 'initial'));

      this.assertText('initial');
    }

    '@test updating a nested path of a {{readonly}}'(assert) {
      let component;

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          didInsertElement() {
            component = this;
          },
        }),
        template: '{{this.value.prop}}',
      });

      this.render('{{foo-bar value=(readonly this.thing)}}', {
        thing: {
          prop: 'initial',
        },
      });

      this.assertText('initial');

      this.assertStableRerender();

      assert.notOk(component.attrs.value.update, 'no update available');
      assert.deepEqual(get(component, 'value'), { prop: 'initial' });
      assert.deepEqual(this.context.thing, { prop: 'initial' });

      runTask(() => set(component, 'value.prop', 'updated!'));

      this.assertText('updated!', 'nested path is updated');
      assert.deepEqual(get(component, 'value'), { prop: 'updated!' });
      assert.deepEqual(this.context.thing, { prop: 'updated!' });

      runTask(() => set(component, 'value.prop', 'initial'));

      this.assertText('initial');
    }

    ['@test {{readonly}} of a string renders correctly']() {
      let component;

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          didInsertElement() {
            component = this;
          },
        }),
        template: '{{this.value}}',
      });

      this.render('{{foo-bar value=(readonly "12")}}');

      this.assertText('12');

      this.assertStableRerender();

      this.assert.notOk(component.attrs.value.update);
      this.assert.strictEqual(get(component, 'value'), '12');

      runTask(() => set(component, 'value', '13'));

      this.assertText('13', 'local property is updated');
      this.assert.strictEqual(get(component, 'value'), '13');

      runTask(() => set(component, 'value', '12'));

      this.assertText('12');
    }

    ['@test {{mut}} of a {{readonly}} mutates only the middle and bottom tiers']() {
      let middle, bottom;

      this.registerComponent('x-bottom', {
        ComponentClass: Component.extend({
          didInsertElement() {
            bottom = this;
          },
        }),
        template: '{{this.bar}}',
      });

      this.registerComponent('x-middle', {
        ComponentClass: Component.extend({
          didInsertElement() {
            middle = this;
          },
        }),
        template: '{{this.foo}} {{x-bottom bar=(mut this.foo)}}',
      });

      this.render('{{x-middle foo=(readonly this.val)}}', {
        val: 12,
      });

      this.assertText('12 12');

      this.assertStableRerender();

      this.assert.equal(get(bottom, 'bar'), 12, "bottom's local bar received the value");
      this.assert.equal(get(middle, 'foo'), 12, "middle's local foo received the value");

      // updating the mut-cell directly
      runTask(() => bottom.attrs.bar.update(13));

      this.assert.equal(
        get(bottom, 'bar'),
        13,
        "bottom's local bar was updated after set of bottom's bar"
      );
      this.assert.equal(
        get(middle, 'foo'),
        13,
        "middle's local foo was updated after set of bottom's bar"
      );
      this.assertText('13 13');
      this.assert.equal(get(this.context, 'val'), 12, 'But context val is not updated');

      runTask(() => set(bottom, 'bar', 14));

      this.assert.equal(
        get(bottom, 'bar'),
        14,
        "bottom's local bar was updated after set of bottom's bar"
      );
      this.assert.equal(
        get(middle, 'foo'),
        14,
        "middle's local foo was updated after set of bottom's bar"
      );
      this.assertText('14 14');
      this.assert.equal(get(this.context, 'val'), 12, 'But context val is not updated');

      this.assert.notOk(middle.attrs.foo.update, "middle's foo attr is not a mutable cell");
      runTask(() => set(middle, 'foo', 15));

      this.assertText('15 15');
      this.assert.equal(get(middle, 'foo'), 15, "set of middle's foo took effect");
      this.assert.equal(
        get(bottom, 'bar'),
        15,
        "bottom's local bar was updated after set of middle's foo"
      );
      this.assert.equal(get(this.context, 'val'), 12, 'Context val remains unchanged');

      runTask(() => set(this.context, 'val', 10));

      this.assertText('10 10');
      this.assert.equal(
        get(bottom, 'bar'),
        10,
        "bottom's local bar was updated after set of context's val"
      );
      this.assert.equal(
        get(middle, 'foo'),
        10,
        "middle's local foo was updated after set of context's val"
      );

      // setting as a normal property
      runTask(() => set(bottom, 'bar', undefined));

      this.assertText(' ');
      this.assert.equal(
        get(bottom, 'bar'),
        undefined,
        "bottom's local bar was updated to a falsy value"
      );
      this.assert.equal(
        get(middle, 'foo'),
        undefined,
        "middle's local foo was updated to a falsy value"
      );

      runTask(() => set(this.context, 'val', 12));
      this.assertText('12 12', 'bottom and middle were both reset');
    }
  }
);
