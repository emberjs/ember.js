import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { set } from 'ember-metal/property_set';

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

  ['@htmlbars should be able to modify a provided attr into local state #11571 / #11559'](assert) {
    let instance;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      },

      didReceiveAttrs() {
        this.set('first', this.getAttr('first').toUpperCase());
      }
    });
    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{first}}' });

    this.render(`{{foo-bar first=firstAttr}}`, {
      firstAttr: 'first attr'
    });

    assert.equal(instance.get('first'), 'FIRST ATTR', 'component lookup uses local state');
    this.assertText('FIRST ATTR');

    this.runTask(() => this.rerender());

    assert.equal(instance.get('first'), 'FIRST ATTR', 'component lookup uses local state during rerender');
    this.assertText('FIRST ATTR');

    // TODO: For some reason didReceiveAttrs is not called after this mutation occurs,
    // See https://github.com/emberjs/ember.js/pull/13203
    // this.runTask(() => set(this.context, 'firstAttr', 'second attr'));
    // assert.equal(instance.get('first'), 'SECOND ATTR', 'component lookup uses modified local state');
    // this.assertText('SECOND ATTR');

    this.runTask(() => set(this.context, 'firstAttr', 'first attr'));

    assert.equal(instance.get('first'), 'FIRST ATTR', 'component lookup uses reset local state');
    this.assertText('FIRST ATTR');
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

  ['@htmlbars getAttr() should return the same value as get()'](assert) {
    assert.expect(20);
    let instance;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        instance = this;
      },

      didReceiveAttrs() {
        let rootFirst = this.get('first');
        let rootSecond = this.get('second');
        let attrFirst = this.getAttr('first');
        let attrSecond = this.getAttr('second');

        equal(rootFirst, attrFirst, 'root property matches attrs value');
        equal(rootSecond, attrSecond, 'root property matches attrs value');
      }
    });
    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render(`{{foo-bar first=first second=second}}`, {
      first: 'first',
      second: 'second'
    });

    assert.equal(instance.get('first'), 'first', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');

    this.runTask(() => this.rerender());

    assert.equal(instance.get('first'), 'first', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');

    this.runTask(() => {
      set(this.context, 'first', 'third');
    });

    assert.equal(instance.get('first'), 'third', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');

    this.runTask(() => {
      set(this.context, 'second', 'fourth');
    });

    assert.equal(instance.get('first'), 'third', 'matches known value');
    assert.equal(instance.get('second'), 'fourth', 'matches known value');

    this.runTask(() => {
      set(this.context, 'first', 'first');
      set(this.context, 'second', 'second');
    });

    assert.equal(instance.get('first'), 'first', 'matches known value');
    assert.equal(instance.get('second'), 'second', 'matches known value');
  }
});
