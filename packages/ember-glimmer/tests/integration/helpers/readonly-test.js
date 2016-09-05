import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { set, get } from 'ember-metal';

moduleFor('Helpers test: {{readonly}}', class extends RenderingTest {

  ['@test {{readonly}} of a path should work']() {
    let component;

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        didInsertElement() {
          component = this;
        }
      }),
      template: '{{value}}'
    });

    this.render('{{foo-bar value=(readonly val)}}', {
      val: 12
    });

    this.assertText('12');

    this.assertStableRerender();

    this.runTask(() => set(component, 'value', 13));
    this.assert.notOk(component.attrs.value.update);

    this.assertText('13', 'local property is updated');
    this.assert.equal(get(this.context, 'val'), 12, 'upstream attribute is not updated');

    // No U-R
  }

  ['@test {{readonly}} of a string renders correctly']() {
    let component;

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        didInsertElement() {
          component = this;
        }
      }),
      template: '{{value}}'
    });

    this.render('{{foo-bar value=(readonly "12")}}');

    this.assertText('12');

    this.assertStableRerender();

    this.assert.notOk(component.attrs.value.update);
    this.assert.strictEqual(get(component, 'value'), '12');

    this.runTask(() => set(component, 'value', '13'));

    this.assertText('13', 'local property is updated');
    this.assert.strictEqual(get(component, 'value'), '13');

    this.runTask(() => set(component, 'value', '12'));

    this.assertText('12');
  }

  ['@test {{mut}} of a {{readonly}} mutates only the middle and bottom tiers']() {
    let middle, bottom;

    this.registerComponent('x-bottom', {
      ComponentClass: Component.extend({
        didInsertElement() {
          bottom = this;
        }
      }),
      template: '{{bar}}'
    });

    this.registerComponent('x-middle', {
      ComponentClass: Component.extend({
        didInsertElement() {
          middle = this;
        }
      }),
      template: '{{foo}} {{x-bottom bar=(mut foo)}}'
    });

    this.render('{{x-middle foo=(readonly val)}}', {
      val: 12
    });

    this.assertText('12 12');

    this.assertStableRerender();

    this.assert.equal(get(bottom, 'bar'), 12, 'bottom\'s local bar received the value');
    this.assert.equal(get(middle, 'foo'), 12, 'middle\'s local foo received the value');

    this.runTask(() => bottom.attrs.bar.update(13));

    this.assert.equal(get(bottom, 'bar'), 13, 'bottom\'s local bar was updated after set of bottom\'s bar');
    this.assert.equal(get(middle, 'foo'), 13, 'middle\'s local foo was updated after set of bottom\'s bar');
    this.assertText('13 13');
    this.assert.equal(get(this.context, 'val'), 12, 'But context val is not updated');

    this.runTask(() => set(bottom, 'bar', 14));

    this.assert.equal(get(bottom, 'bar'), 14, 'bottom\'s local bar was updated after set of bottom\'s bar');
    this.assert.equal(get(middle, 'foo'), 14, 'middle\'s local foo was updated after set of bottom\'s bar');
    this.assertText('14 14');
    this.assert.equal(get(this.context, 'val'), 12, 'But context val is not updated');

    this.assert.notOk(middle.attrs.foo.update, 'middle\'s foo attr is not a mutable cell');
    this.runTask(() => set(middle, 'foo', 15));

    this.assertText('15 15');
    this.assert.equal(get(middle, 'foo'), 15, 'set of middle\'s foo took effect');
    this.assert.equal(get(bottom, 'bar'), 15, 'bottom\'s local bar was updated after set of middle\'s foo');
    this.assert.equal(get(this.context, 'val'), 12, 'Context val remains unchanged');

    this.runTask(() => set(this.context, 'val', 10));

    this.assertText('10 10');
    this.assert.equal(get(bottom, 'bar'), 10, 'bottom\'s local bar was updated after set of context\'s val');
    this.assert.equal(get(middle, 'foo'), 10, 'middle\'s local foo was updated after set of context\'s val');

    this.runTask(() => set(bottom, 'bar', undefined));

    this.assertText(' ');
    this.assert.equal(get(bottom, 'bar'), undefined, 'bottom\'s local bar was updated to a falsy value');
    this.assert.equal(get(middle, 'foo'), undefined, 'middle\'s local foo was updated to a falsy value');

    this.runTask(() => set(this.context, 'val', 12));
    this.assertText('12 12', 'bottom and middle were both reset');
  }

 });
