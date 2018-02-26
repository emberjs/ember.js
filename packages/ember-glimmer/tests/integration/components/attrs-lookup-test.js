import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { set, computed } from 'ember-metal';
import { styles } from '../../utils/test-helpers';

moduleFor('Components test: attrs lookup', class extends RenderingTest {

  ['@test it should be able to lookup attrs without `attrs.` - template access']() {
    this.registerComponent('foo-bar', { template: '{{first}}' });

    this.render(`{{foo-bar first=firstAttr}}`, {
      firstAttr: 'first attr'
    });

    this.assertText('first attr');

    this.runTask(() => this.rerender());

    this.assertText('first attr');

    this.runTask(() => set(this.context, 'firstAttr', 'second attr'));

    this.assertText('second attr');

    this.runTask(() => set(this.context, 'firstAttr', 'first attr'));

    this.assertText('first attr');
  }

  ['@test it should be able to lookup attrs without `attrs.` - component access'](assert) {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      }
    });
    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{first}}' });

    this.render(`{{foo-bar first=firstAttr}}`, {
      firstAttr: 'first attr'
    });

    assert.equal(instance.get('first'), 'first attr');

    this.runTask(() => this.rerender());

    assert.equal(instance.get('first'), 'first attr');

    this.runTask(() => set(this.context, 'firstAttr', 'second attr'));

    assert.equal(instance.get('first'), 'second attr');

    this.runTask(() => set(this.context, 'firstAttr', 'first attr'));

    this.assertText('first attr');
  }

  ['@test should be able to modify a provided attr into local state #11571 / #11559'](assert) {
    let instance;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      },

      didReceiveAttrs() {
        this.set('first', this.get('first').toUpperCase());
      }
    });
    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{first}}' });

    this.render(`{{foo-bar first="first attr"}}`);

    assert.equal(instance.get('first'), 'FIRST ATTR', 'component lookup uses local state');
    this.assertText('FIRST ATTR');

    this.runTask(() => this.rerender());

    assert.equal(instance.get('first'), 'FIRST ATTR', 'component lookup uses local state during rerender');
    this.assertText('FIRST ATTR');

    // This is testing that passing string literals for use as initial values,
    // so there is no update step
  }

  ['@test should be able to access unspecified attr #12035'](assert) {
    let instance;
    let wootVal = 'yes';

    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      },

      didReceiveAttrs() {
        assert.equal(this.get('woot'), wootVal, 'found attr in didReceiveAttrs');
      }
    });
    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render(`{{foo-bar woot=woot}}`, {
      woot: wootVal
    });

    assert.equal(instance.get('woot'), 'yes', 'component found attr');

    this.runTask(() => this.rerender());

    assert.equal(instance.get('woot'), 'yes', 'component found attr after rerender');

    this.runTask(() => {
      wootVal = 'nope';
      set(this.context, 'woot', wootVal);
    });

    assert.equal(instance.get('woot'), 'nope', 'component found attr after attr change');

    this.runTask(() => {
      wootVal = 'yes';
      set(this.context, 'woot', wootVal);
    });

    assert.equal(instance.get('woot'), 'yes', 'component found attr after reset');
  }

  ['@test getAttr() should return the same value as get()'](assert) {
    assert.expect(33);

    let instance;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      },

      didReceiveAttrs() {
        let rootFirstPositional = this.get('firstPositional');
        let rootFirst = this.get('first');
        let rootSecond = this.get('second');
        let attrFirstPositional = this.getAttr('firstPositional');
        let attrFirst = this.getAttr('first');
        let attrSecond = this.getAttr('second');

        equal(rootFirstPositional, attrFirstPositional, 'root property matches attrs value');
        equal(rootFirst, attrFirst, 'root property matches attrs value');
        equal(rootSecond, attrSecond, 'root property matches attrs value');
      }
    });

    FooBarComponent.reopenClass({
      positionalParams: ['firstPositional']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render(`{{foo-bar firstPositional first=first second=second}}`, {
      firstPositional: 'firstPositional',
      first: 'first',
      second: 'second'
    });

    assert.equal(instance.get('firstPositional'), 'firstPositional', 'matches known value');
    assert.equal(instance.get('first'), 'first', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');

    this.runTask(() => this.rerender());

    assert.equal(instance.get('firstPositional'), 'firstPositional', 'matches known value');
    assert.equal(instance.get('first'), 'first', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');

    this.runTask(() => {
      set(this.context, 'first', 'third');
    });

    assert.equal(instance.get('firstPositional'), 'firstPositional', 'matches known value');
    assert.equal(instance.get('first'), 'third', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');

    this.runTask(() => {
      set(this.context, 'second', 'fourth');
    });

    assert.equal(instance.get('firstPositional'), 'firstPositional', 'matches known value');
    assert.equal(instance.get('first'), 'third', 'matches known value');
    assert.equal(instance.get('second'), 'fourth', 'matches known value');

    this.runTask(() => {
      set(this.context, 'firstPositional', 'fifth');
    });

    assert.equal(instance.get('firstPositional'), 'fifth', 'matches known value');
    assert.equal(instance.get('first'), 'third', 'matches known value');
    assert.equal(instance.get('second'), 'fourth', 'matches known value');

    this.runTask(() => {
      set(this.context, 'firstPositional', 'firstPositional');
      set(this.context, 'first', 'first');
      set(this.context, 'second', 'second');
    });

    assert.equal(instance.get('firstPositional'), 'firstPositional', 'matches known value');
    assert.equal(instance.get('first'), 'first', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');
  }

  ['@test bound computed properties can be overridden in extensions, set during init, and passed in as attrs']() {
    let FooClass = Component.extend({
      attributeBindings: ['style'],
      style: computed('height', 'color', function() {
        let height = this.get('height');
        let color = this.get('color');
        return `height: ${height}px; background-color: ${color};`;
      }),
      color: 'red',
      height: 20
    });

    let BarClass = FooClass.extend({
      init() {
        this._super(...arguments);
        this.height = 150;
      },
      color: 'yellow'
    });

    this.registerComponent('x-foo', { ComponentClass: FooClass });
    this.registerComponent('x-bar', { ComponentClass: BarClass });

    this.render('{{x-foo}}{{x-bar}}{{x-bar color="green"}}');

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { style: styles('height: 20px; background-color: red;') } });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { style: styles('height: 150px; background-color: yellow;') } });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { style: styles('height: 150px; background-color: green;') } });

    this.assertStableRerender();

    // No U-R
  }
});
