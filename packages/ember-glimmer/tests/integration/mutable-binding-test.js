import { RenderingTest, moduleFor } from '../utils/test-case';
import { Component } from '../utils/helpers';
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';

moduleFor('@htmlbars Mutable bindings integration tests', class extends RenderingTest {

  ['@test a simple mutable binding using `mut` propagates properly'](assert) {
    let bottom;

    this.registerComponent('bottom-mut', {
      ComponentClass: Component.extend({
        didInsertElement() {
          bottom = this;
        }
      }),
      template: '{{setMe}}'
    });

    this.registerComponent('middle-mut', {
      template: '{{bottom-mut setMe=value}}'
    });

    this.render('{{middle-mut value=(mut val)}}', {
      val: 12
    });

    this.assertText('12', 'the data propagated downwards');

    this.assertStableRerender();

    this.runTask(() => bottom.attrs.setMe.update(13));

    this.assertText('13', 'The set took effect');
    assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  ['@test a simple mutable binding using `mut` inserts into the DOM'](assert) {
    let bottom;

    this.registerComponent('bottom-mut', {
      ComponentClass: Component.extend({
        didInsertElement() {
          bottom = this;
        }
      }),
      template: '{{setMe}}'
    });

    this.registerComponent('middle-mut', {
      template: '{{bottom-mut setMe=(mut value)}}'
    });

    this.render('{{middle-mut value=(mut val)}}', {
      val: 12
    });

    this.assertText('12', 'the data propagated downwards');

    this.assertStableRerender();

    this.runTask(() => bottom.attrs.setMe.update(13));

    this.assertText('13', 'the set took effect');
    assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  // See https://github.com/emberjs/ember.js/commit/807a0cd for an explanation of this test
  ['@test using a string value through middle tier does not trigger assertion'](assert) {
    let bottom;

    this.registerComponent('bottom-mut', {
      ComponentClass: Component.extend({
        didInsertElement() {
          bottom = this;
        }
      }),
      template: '{{stuff}}'
    });

    this.registerComponent('middle-mut', {
      template: '{{bottom-mut stuff=value}}'
    });

    this.render('{{middle-mut value="foo"}}');

    assert.equal(bottom.attrs.stuff.value, 'foo', 'the data propagated');
    this.assertText('foo');

    this.assertStableRerender();

    // No U-R for this test
  }

  ['@test a simple mutable binding using `mut` can be converted into an immutable binding'](assert) {
    let middle, bottom;

    this.registerComponent('bottom-mut', {
      ComponentClass: Component.extend({
        didInsertElement() {
          bottom = this;
        }
      }),
      template: '{{setMe}}'
    });

    this.registerComponent('middle-mut', {
      ComponentClass: Component.extend({
        didInsertElement() {
          middle = this;
        }
      }),
      template: '{{bottom-mut setMe=(readonly value)}}'
    });

    this.render('{{middle-mut value=(mut val)}}', {
      val: 12
    });

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => middle.attrs.value.update(13));

    assert.strictEqual(middle.attrs.value.value, 13, 'the set took effect');
    assert.strictEqual(bottom.attrs.setMe, 13, 'the mutable binding has been converted to an immutable cell');
    this.assertText('13');
    assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  ['@test mutable bindings work inside of yielded content']() {
    this.registerComponent('bottom-mut', {
      template: '{{yield}}'
    });

    this.registerComponent('middle-mut', {
      template: '{{#bottom-mut}}{{model.name}}{{/bottom-mut}}'
    });

    this.render('{{middle-mut model=(mut view.model)}}', {
      model: { name: 'Matthew Beale' }
    });

    this.assertText('Matthew Beale');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'model.name', 'Joel Kang'));

    this.assertText('Joel Kang');

    this.runTask(() => set(this.context, 'model', { name: 'Matthew Beale' }));

    this.assertText('Matthew Beale');
  }

  ['@test a simple mutable binding using `mut` is available in hooks'](assert) {
    let bottom;
    let willRender = [];
    let didInsert = [];

    this.registerComponent('bottom-mut', {
      ComponentClass: Component.extend({
        willRender() {
          willRender.push(this.attrs.setMe.value);
        },
        didInsertElement() {
          didInsert.push(this.attrs.setMe.value);
          bottom = this;
        }
      }),
      template: '{{setMe}}'
    });

    this.registerComponent('middle-mut', {
      template: '{{bottom-mut setMe=(mut value)}}'
    });

    this.render('{{middle-mut value=(mut val)}}', {
      val: 12
    });

    assert.deepEqual(willRender, [12], 'willReceive is [12]');
    assert.deepEqual(didInsert, [12], 'didInsert is [12]');
    this.assertText('12');

    this.assertStableRerender();

    assert.deepEqual(willRender, [12, 12], 'willReceive is [12, 12]');
    assert.deepEqual(didInsert, [12], 'didInsert is [12]');
    assert.strictEqual(bottom.attrs.setMe.value, 12, 'the data propagated');

    this.runTask(() => bottom.attrs.setMe.update(13));

    assert.strictEqual(bottom.attrs.setMe.value, 13, 'the set took effect');
    assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  ['@test a mutable binding with a backing computed property and attribute present in the root of the component is updated when the upstream property invalidates #11023'](assert) {
    let bottom, middle;

    this.registerComponent('bottom-mut', {
      ComponentClass: Component.extend({
        thingy: null,
        didInsertElement() {
          bottom = this;
        }
      }),
      template: '{{thingy}}'
    });

    this.registerComponent('middle-mut', {
      ComponentClass: Component.extend({
        baseValue: 12,
        val: computed('baseValue', function() {
          return this.get('baseValue');
        }),
        didInsertElement() {
          middle = this;
        }
      }),
      template: '{{bottom-mut thingy=(mut val)}}'
    });

    this.render('{{middle-mut}}');

    assert.strictEqual(bottom.attrs.thingy.value, 12, 'data propagated');
    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => set(middle, 'baseValue', 13));

    assert.strictEqual(bottom.attrs.thingy.value, 13, 'the set took effect');
    this.assertText('13');

    this.runTask(() => set(middle, 'baseValue', 12));

    this.assertText('12');
  }

  // This test only makes sense for htmlbars since there will not be automatic bindings in Glimmer2
  ['@htmlbars automatic mutable bindings tolerate undefined non-stream inputs and attempts to set them'](assert) {
    let inner;

    this.registerComponent('x-inner', {
      ComponentClass: Component.extend({
        didInsertElement() {
          inner = this;
        }
      }),
      template: '{{model}}'
    });

    this.registerComponent('x-outer', {
      template: '{{x-inner model=nonexistent}}'
    });

    this.render('{{x-outer}}');

    this.assertText('');

    this.assertStableRerender();

    this.runTask(() => inner.attrs.model.update(42));

    assert.equal(inner.attrs.model.value, 42);
    this.assertText('42');

    this.runTask(() => inner.attrs.model.update(undefined));

    this.assertText('');
  }

  // This test only makes sense for htmlbars since there will not be automatic bindings in Glimmer2
  ['@test automatic mutable bindings tolerate constant non-stream inputs and attempts to set them'](assert) {
    let inner;

    this.registerComponent('x-inner', {
      ComponentClass: Component.extend({
        didInsertElement() {
          inner = this;
        }
      }),
      template: 'hello{{model}}'
    });

    this.registerComponent('x-outer', {
      template: '{{x-inner model=x}}'
    });

    this.render('{{x-outer x="foo"}}');

    this.assertText('hellofoo');

    this.assertStableRerender();

    this.runTask(() => inner.attrs.model.update(42));

    assert.equal(inner.attrs.model.value, 42);
    this.assertText('hello42');


    this.runTask(() => inner.attrs.model.update('foo'));

    this.assertText('hellofoo');
  }

});
