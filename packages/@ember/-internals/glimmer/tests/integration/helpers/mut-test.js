import { RenderingTestCase, moduleFor, styles, runTask } from 'internal-test-helpers';

import { set, get, computed } from '@ember/object';

import { Component, htmlSafe } from '../../utils/helpers';

moduleFor(
  'Helpers test: {{mut}}',
  class extends RenderingTestCase {
    ['@test a simple mutable binding using `mut` propagates properly']() {
      let bottom;

      this.registerComponent('bottom-mut', {
        ComponentClass: Component.extend({
          didInsertElement() {
            bottom = this;
          },
        }),
        template: '{{this.setMe}}',
      });

      this.registerComponent('middle-mut', {
        template: '{{bottom-mut setMe=this.value}}',
      });

      this.render('{{middle-mut value=(mut this.val)}}', {
        val: 12,
      });

      this.assertText('12', 'the data propagated downwards');

      this.assertStableRerender();

      runTask(() => bottom.attrs.setMe.update(13));

      this.assertText('13', 'the set took effect');
      this.assert.strictEqual(get(bottom, 'setMe'), 13, "the set took effect on bottom's prop");
      this.assert.strictEqual(bottom.attrs.setMe.value, 13, "the set took effect on bottom's attr");
      this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

      runTask(() => set(bottom, 'setMe', 14));

      this.assertText('14', 'the set took effect');
      this.assert.strictEqual(get(bottom, 'setMe'), 14, "the set took effect on bottom's prop");
      this.assert.strictEqual(bottom.attrs.setMe.value, 14, "the set took effect on bottom's attr");
      this.assert.strictEqual(get(this.context, 'val'), 14, 'the set propagated back up');

      runTask(() => set(this.context, 'val', 12));

      this.assertText('12');
    }

    ['@test a simple mutable binding using `mut` inserts into the DOM']() {
      let bottom, middle;

      this.registerComponent('bottom-mut', {
        ComponentClass: Component.extend({
          didInsertElement() {
            bottom = this;
          },
        }),
        template: '{{this.setMe}}',
      });

      this.registerComponent('middle-mut', {
        ComponentClass: Component.extend({
          didInsertElement() {
            middle = this;
          },
        }),
        template: '{{bottom-mut setMe=(mut this.value)}}',
      });

      this.render('{{middle-mut value=(mut this.val)}}', {
        val: 12,
      });

      this.assertText('12', 'the data propagated downwards');

      this.assertStableRerender();

      runTask(() => bottom.attrs.setMe.update(13));

      this.assertText('13', 'the set took effect');
      this.assert.strictEqual(get(bottom, 'setMe'), 13, "the set took effect on bottom's prop");
      this.assert.strictEqual(bottom.attrs.setMe.value, 13, "the set took effect on bottom's attr");
      this.assert.strictEqual(get(middle, 'value'), 13, "the set propagated to middle's prop");
      this.assert.strictEqual(middle.attrs.value.value, 13, "the set propagated to middle's attr");
      this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

      runTask(() => set(bottom, 'setMe', 14));

      this.assertText('14', 'the set took effect');
      this.assert.strictEqual(get(bottom, 'setMe'), 14, "the set took effect on bottom's prop");
      this.assert.strictEqual(bottom.attrs.setMe.value, 14, "the set took effect on bottom's attr");
      this.assert.strictEqual(get(middle, 'value'), 14, "the set propagated to middle's prop");
      this.assert.strictEqual(middle.attrs.value.value, 14, "the set propagated to middle's attr");
      this.assert.strictEqual(get(this.context, 'val'), 14, 'the set propagated back up');

      runTask(() => set(this.context, 'val', 12));

      this.assertText('12');
    }

    ['@test passing a literal results in a assertion']() {
      this.registerComponent('bottom-mut', { template: '{{this.setMe}}' });

      expectAssertion(() => {
        this.render('{{bottom-mut setMe=(mut "foo bar")}}');
      }, 'You can only pass a path to mut');
    }

    ['@test passing the result of a helper invocation results in an assertion']() {
      this.registerComponent('bottom-mut', { template: '{{this.setMe}}' });

      expectAssertion(() => {
        this.render('{{bottom-mut setMe=(mut (concat "foo" " " "bar"))}}');
      }, 'You can only pass a path to mut');
    }

    // See https://github.com/emberjs/ember.js/commit/807a0cd for an explanation of this test
    ['@test using a string value through middle tier does not trigger assertion (due to the auto-mut transform)']() {
      let bottom;

      this.registerComponent('bottom-mut', {
        ComponentClass: Component.extend({
          didInsertElement() {
            bottom = this;
          },
        }),
        template: '{{this.stuff}}',
      });

      this.registerComponent('middle-mut', {
        template: '{{bottom-mut stuff=this.value}}',
      });

      this.render('{{middle-mut value="foo"}}');

      this.assert.equal(get(bottom, 'stuff'), 'foo', 'the data propagated');
      this.assertText('foo');

      this.assertStableRerender();

      // No U-R for this test
    }

    ['@test {{readonly}} of a {{mut}} is converted into an immutable binding']() {
      let middle, bottom;

      this.registerComponent('bottom-mut', {
        ComponentClass: Component.extend({
          didInsertElement() {
            bottom = this;
          },
        }),
        template: '{{this.setMe}}',
      });

      this.registerComponent('middle-mut', {
        ComponentClass: Component.extend({
          didInsertElement() {
            middle = this;
          },
        }),
        template: '{{bottom-mut setMe=(readonly this.value)}}',
      });

      this.render('{{middle-mut value=(mut this.val)}}', {
        val: 12,
      });

      this.assertText('12');

      this.assertStableRerender();

      runTask(() => middle.attrs.value.update(13));

      this.assert.strictEqual(get(middle, 'value'), 13, "the set took effect on middle's prop");
      this.assert.strictEqual(middle.attrs.value.value, 13, "the set took effect on middle's attr");

      runTask(() => set(middle, 'value', 14));

      this.assert.strictEqual(get(middle, 'value'), 14, "the set took effect on middle's prop");
      this.assert.strictEqual(middle.attrs.value.value, 14, "the set took effect on middle's attr");
      this.assert.strictEqual(
        bottom.attrs.setMe,
        14,
        'the mutable binding has been converted to an immutable cell'
      );
      this.assertText('14');
      this.assert.strictEqual(get(this.context, 'val'), 14, 'the set propagated back up');

      runTask(() => set(this.context, 'val', 12));

      this.assertText('12');
    }

    ['@test mutable bindings work inside of yielded content']() {
      this.registerComponent('bottom-mut', {
        template: '{{yield}}',
      });

      this.registerComponent('middle-mut', {
        template: '{{#bottom-mut}}{{@model.name}}{{/bottom-mut}}',
      });

      this.render('{{middle-mut model=(mut this.model)}}', {
        model: { name: 'Matthew Beale' },
      });

      this.assertText('Matthew Beale');

      this.assertStableRerender();

      runTask(() => set(this.context, 'model.name', 'Joel Kang'));

      this.assertText('Joel Kang');

      runTask(() => set(this.context, 'model', { name: 'Matthew Beale' }));

      this.assertText('Matthew Beale');
    }

    ['@test a simple mutable binding using {{mut}} is available in hooks']() {
      let bottom;
      let willRender = [];
      let didInsert = [];

      this.registerComponent('bottom-mut', {
        ComponentClass: Component.extend({
          willRender() {
            willRender.push(get(this, 'setMe'));
          },
          didInsertElement() {
            didInsert.push(get(this, 'setMe'));
            bottom = this;
          },
        }),
        template: '{{this.setMe}}',
      });

      this.registerComponent('middle-mut', {
        template: '{{bottom-mut setMe=(mut this.value)}}',
      });

      this.render('{{middle-mut value=(mut this.val)}}', {
        val: 12,
      });

      this.assert.deepEqual(willRender, [12], 'willReceive is [12]');
      this.assert.deepEqual(didInsert, [12], 'didInsert is [12]');
      this.assertText('12');

      this.assertStableRerender();

      this.assert.deepEqual(willRender, [12], 'willReceive is [12]');
      this.assert.deepEqual(didInsert, [12], 'didInsert is [12]');
      this.assert.strictEqual(get(bottom, 'setMe'), 12, 'the data propagated');

      runTask(() => bottom.attrs.setMe.update(13));

      this.assert.strictEqual(get(bottom, 'setMe'), 13, "the set took effect on bottom's prop");
      this.assert.strictEqual(bottom.attrs.setMe.value, 13, "the set took effect on bottom's attr");
      this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

      runTask(() => set(bottom, 'setMe', 14));

      this.assert.strictEqual(get(bottom, 'setMe'), 14, "the set took effect on bottom's prop");
      this.assert.strictEqual(bottom.attrs.setMe.value, 14, "the set took effect on bottom's attr");
      this.assert.strictEqual(get(this.context, 'val'), 14, 'the set propagated back up');

      runTask(() => set(this.context, 'val', 12));

      this.assertText('12');
    }

    ['@test a mutable binding with a backing computed property and attribute present in the root of the component is updated when the upstream property invalidates #11023']() {
      let bottom, middle;

      this.registerComponent('bottom-mut', {
        ComponentClass: Component.extend({
          thingy: null,
          didInsertElement() {
            bottom = this;
          },
        }),
        template: '{{this.thingy}}',
      });

      this.registerComponent('middle-mut', {
        ComponentClass: Component.extend({
          baseValue: 12,
          val: computed('baseValue', function () {
            return this.get('baseValue');
          }),
          didInsertElement() {
            middle = this;
          },
        }),
        template: '{{bottom-mut thingy=(mut this.val)}}',
      });

      this.render('{{middle-mut}}');

      this.assert.strictEqual(get(bottom, 'thingy'), 12, 'data propagated');
      this.assertText('12');

      this.assertStableRerender();

      runTask(() => set(middle, 'baseValue', 13));

      this.assert.strictEqual(get(middle, 'val'), 13, 'the set took effect');
      this.assert.strictEqual(
        bottom.attrs.thingy.value,
        13,
        "the set propagated down to bottom's attrs"
      );
      this.assert.strictEqual(
        get(bottom, 'thingy'),
        13,
        "the set propagated down to bottom's prop"
      );
      this.assertText('13');

      runTask(() => set(middle, 'baseValue', 12));

      this.assertText('12');
    }

    ['@test automatic mutable bindings exposes a mut cell in attrs']() {
      let inner;

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          didInsertElement() {
            inner = this;
          },
        }),
        template: '{{this.foo}}',
      });

      this.registerComponent('x-outer', {
        template: '{{x-inner foo=this.bar}}',
      });

      this.render('{{x-outer bar=this.baz}}', { baz: 'foo' });

      this.assertText('foo');

      this.assertStableRerender();

      runTask(() => inner.attrs.foo.update('bar'));

      this.assert.equal(inner.attrs.foo.value, 'bar');
      this.assert.equal(get(inner, 'foo'), 'bar');
      this.assertText('bar');

      runTask(() => inner.attrs.foo.update('foo'));

      this.assertText('foo');
    }

    ['@test automatic mutable bindings tolerate undefined non-stream inputs and attempts to set them']() {
      let inner;

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          didInsertElement() {
            inner = this;
          },
        }),
        template: '{{@model}}',
      });

      this.registerComponent('x-outer', {
        template: '{{x-inner model=this.nonexistent}}',
      });

      this.render('{{x-outer}}');

      this.assertText('');

      this.assertStableRerender();

      runTask(() => inner.attrs.model.update(42));

      this.assert.equal(inner.attrs.model.value, 42);
      this.assert.equal(get(inner, 'model'), 42);
      this.assertText('42');

      runTask(() => inner.attrs.model.update(undefined));

      this.assertText('');
    }

    ['@test automatic mutable bindings tolerate constant non-stream inputs and attempts to set them']() {
      let inner;

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          didInsertElement() {
            inner = this;
          },
        }),
        template: 'hello{{@model}}',
      });

      this.registerComponent('x-outer', {
        // Use `this.x` here instead of `@x` to let `x-inner` mutate `this.x`.
        // `@x` points to the literal binding from `x-outer`, which is of
        // course immutable.
        template: '{{x-inner model=this.x}}',
      });

      this.render('{{x-outer x="foo"}}');

      this.assertText('hellofoo');

      this.assertStableRerender();

      runTask(() => inner.attrs.model.update(42));

      this.assert.equal(inner.attrs.model.value, 42);
      this.assert.equal(get(inner, 'model'), 42);
      this.assertText('hello42');

      runTask(() => inner.attrs.model.update('foo'));

      this.assertText('hellofoo');
    }
  }
);

moduleFor(
  'Mutable Bindings used in Computed Properties that are bound as attributeBindings',
  class extends RenderingTestCase {
    ['@test an attribute binding of a computed property of a 2-way bound attr recomputes when the attr changes']() {
      let input, output;

      this.registerComponent('x-input', {
        ComponentClass: Component.extend({
          didInsertElement() {
            input = this;
          },
        }),
      });

      this.registerComponent('x-output', {
        ComponentClass: Component.extend({
          attributeBindings: ['style'],
          didInsertElement() {
            output = this;
          },
          style: computed('height', function () {
            let height = this.get('height');
            return htmlSafe(`height: ${height}px;`);
          }),
          height: 20,
        }),
        template: '{{this.height}}',
      });

      this.render('{{x-output height=this.height}}{{x-input height=(mut this.height)}}', {
        height: 60,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 60px;') },
        content: '60',
      });

      this.assertStableRerender();

      runTask(() => input.attrs.height.update(35));

      this.assert.strictEqual(get(output, 'height'), 35, 'the set took effect');
      this.assert.strictEqual(get(this.context, 'height'), 35, 'the set propagated back up');
      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 35px;') },
        content: '35',
      });

      runTask(() => set(input, 'height', 36));

      this.assert.strictEqual(get(output, 'height'), 36, 'the set took effect');
      this.assert.strictEqual(get(this.context, 'height'), 36, 'the set propagated back up');
      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 36px;') },
        content: '36',
      });

      runTask(() => set(this.context, 'height', 60));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 60px;') },
        content: '60',
      });
      this.assert.strictEqual(get(input, 'height'), 60);
    }

    ['@test an attribute binding of a computed property with a setter of a 2-way bound attr recomputes when the attr changes']() {
      let input, output;

      this.registerComponent('x-input', {
        ComponentClass: Component.extend({
          didInsertElement() {
            input = this;
          },
        }),
      });

      this.registerComponent('x-output', {
        ComponentClass: Component.extend({
          attributeBindings: ['style'],
          didInsertElement() {
            output = this;
          },
          style: computed('height', 'width', function () {
            let height = this.get('height');
            let width = this.get('width');
            return htmlSafe(`height: ${height}px; width: ${width}px;`);
          }),
          height: 20,
          width: computed('height', {
            get() {
              return this.get('height') * 2;
            },
            set(keyName, width) {
              this.set('height', width / 2);
              return width;
            },
          }),
        }),
        template: '{{this.width}}x{{this.height}}',
      });

      this.render('{{x-output width=this.width}}{{x-input width=(mut this.width)}}', {
        width: 70,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 35px; width: 70px;') },
        content: '70x35',
      });

      this.assertStableRerender();

      runTask(() => set(input, 'width', 80));

      this.assert.strictEqual(get(output, 'width'), 80, 'the set took effect');
      this.assert.strictEqual(get(this.context, 'width'), 80, 'the set propagated back up');
      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 40px; width: 80px;') },
        content: '80x40',
      });

      runTask(() => input.attrs.width.update(90));

      this.assert.strictEqual(get(output, 'width'), 90, 'the set took effect');
      this.assert.strictEqual(get(this.context, 'width'), 90, 'the set propagated back up');
      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 45px; width: 90px;') },
        content: '90x45',
      });

      runTask(() => set(this.context, 'width', 70));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { style: styles('height: 35px; width: 70px;') },
        content: '70x35',
      });
      this.assert.strictEqual(get(input, 'width'), 70);
    }
  }
);
