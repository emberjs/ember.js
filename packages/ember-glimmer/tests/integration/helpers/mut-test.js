import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';
import { styles } from '../../utils/test-helpers';

moduleFor('Helpers test {{mut}}', class extends RenderingTest {

  ['@test a simple mutable binding using `mut` propagates properly']() {
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

    this.runTask(() => set(bottom, 'setMe', 13));

    this.assertText('13', 'The set took effect');
    this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  ['@test a simple mutable binding using `mut` inserts into the DOM']() {
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

    this.runTask(() => set(bottom, 'setMe', 13));

    this.assertText('13', 'the set took effect');
    this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  // See https://github.com/emberjs/ember.js/commit/807a0cd for an explanation of this test
  ['@test using a string value through middle tier does not trigger assertion']() {
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
      template: '{{bottom-mut stuff=(mut value)}}'
    });

    this.render('{{middle-mut value="foo"}}');

    this.assert.equal(get(bottom, 'stuff'), 'foo', 'the data propagated');
    this.assertText('foo');

    this.assertStableRerender();

    // No U-R for this test
  }

  ['@test a simple mutable binding using `mut` can be converted into an immutable binding']() {
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

    this.runTask(() => set(middle, 'value', 13));

    this.assert.strictEqual(get(middle, 'value'), 13, 'the set took effect');

    this.assert.strictEqual(get(bottom, 'setMe'), 13, 'the mutable binding has been converted to an immutable cell');
    this.assertText('13');
    this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

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

    this.render('{{middle-mut model=(mut model)}}', {
      model: { name: 'Matthew Beale' }
    });

    this.assertText('Matthew Beale');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'model.name', 'Joel Kang'));

    this.assertText('Joel Kang');

    this.runTask(() => set(this.context, 'model', { name: 'Matthew Beale' }));

    this.assertText('Matthew Beale');
  }

  ['@test a simple mutable binding using `mut` is available in hooks']() {
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

    this.assert.deepEqual(willRender, [12], 'willReceive is [12]');
    this.assert.deepEqual(didInsert, [12], 'didInsert is [12]');
    this.assertText('12');

    this.assertStableRerender();

    if (this.isHTMLBars) {
      this.assert.deepEqual(willRender, [12, 12], 'willReceive is [12, 12]');
    } else {
      this.assert.deepEqual(willRender, [12], 'willReceive is [12]');
    }
    this.assert.deepEqual(didInsert, [12], 'didInsert is [12]');
    this.assert.strictEqual(get(bottom, 'setMe'), 12, 'the data propagated');

    this.runTask(() => set(bottom, 'setMe', 13));

    this.assert.strictEqual(get(bottom, 'setMe'), 13, 'the set took effect');
    this.assert.strictEqual(get(this.context, 'val'), 13, 'the set propagated back up');

    this.runTask(() => set(this.context, 'val', 12));

    this.assertText('12');
  }

  ['@test a mutable binding with a backing computed property and attribute present in the root of the component is updated when the upstream property invalidates #11023']() {
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

    this.assert.strictEqual(get(bottom, 'thingy'), 12, 'data propagated');
    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => set(middle, 'baseValue', 13));

    this.assert.strictEqual(get(bottom, 'thingy'), 13, 'the set took effect');
    this.assertText('13');

    this.runTask(() => set(middle, 'baseValue', 12));

    this.assertText('12');
  }

  ['@htmlbars automatic mutable bindings tolerate undefined non-stream inputs and attempts to set them']() {
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

    this.assert.equal(inner.attrs.model.value, 42);
    this.assertText('42');

    this.runTask(() => inner.attrs.model.update(undefined));

    this.assertText('');
  }

  ['@htmlbars automatic mutable bindings tolerate constant non-stream inputs and attempts to set them']() {
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

    this.assert.equal(inner.attrs.model.value, 42);
    this.assertText('hello42');


    this.runTask(() => inner.attrs.model.update('foo'));

    this.assertText('hellofoo');
  }

});

moduleFor('Mutable Bindings used in Computed Properties that are bound as attributeBindings', class extends RenderingTest {

  ['@test an attribute binding of a computed property of a 2-way bound attr recomputes when the attr changes']() {
    let input, output;

    this.registerComponent('x-input', {
      ComponentClass: Component.extend({
        didInsertElement() {
          input = this;
        }
      })
    });

    this.registerComponent('x-output', {
      ComponentClass: Component.extend({
        attributeBindings: ['style'],
        didInsertElement() {
          output = this;
        },
        style: computed('height', function() {
          let height = this.get('height');
          return `height: ${height}px;`;
        }),
        height: 20
      }),
      template: '{{height}}'
    });

    this.render('{{x-output height=height}}{{x-input height=(mut height)}}', {
      height: 60
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 60px;') }, content: '60' });

    this.assertStableRerender();

    this.runTask(() => set(input, 'height', 35));

    this.assert.strictEqual(get(output, 'height'), 35, 'the set took effect');
    this.assert.strictEqual(get(this.context, 'height'), 35, 'the set propagated back up');
    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 35px;') }, content: '35' });

    this.runTask(() => set(this.context, 'height', 60));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 60px;') }, content: '60' });
    this.assert.strictEqual(get(input, 'height'), 60);
  }

  ['@test an attribute binding of a computed property with a setter of a 2-way bound attr recomputes when the attr changes']() {
    let input, output;

    this.registerComponent('x-input', {
      ComponentClass: Component.extend({
        didInsertElement() {
          input = this;
        }
      })
    });

    this.registerComponent('x-output', {
      ComponentClass: Component.extend({
        attributeBindings: ['style'],
        didInsertElement() {
          output = this;
        },
        style: computed('height', 'width', function() {
          let height = this.get('height');
          let width = this.get('width');
          return `height: ${height}px; width: ${width}px;`;
        }),
        height: 20,
        width: computed('height', {
          get() {
            return this.get('height') * 2;
          },
          set(keyName, width) {
            this.set('height', width / 2);
            return width;
          }
        })
      }),
      template: '{{width}}x{{height}}'
    });

    this.render('{{x-output width=width}}{{x-input width=(mut width)}}', {
      width: 70
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 35px; width: 70px;') }, content: '70x35' });

    this.assertStableRerender();

    this.runTask(() => set(input, 'width', 80));

    this.assert.strictEqual(get(output, 'width'), 80, 'the set took effect');
    this.assert.strictEqual(get(this.context, 'width'), 80, 'the set propagated back up');
    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 40px; width: 80px;') }, content: '80x40' });

    this.runTask(() => set(this.context, 'width', 70));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 35px; width: 70px;') }, content: '70x35' });
    this.assert.strictEqual(get(input, 'width'), 70);
  }
});
