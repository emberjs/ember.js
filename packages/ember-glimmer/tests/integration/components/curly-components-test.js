/* globals EmberDev */
import { set } from 'ember-metal/property_set';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { classes } from '../../utils/test-helpers';
import { htmlSafe } from 'ember-htmlbars/utils/string';

moduleFor('Components test: curly components', class extends RenderingTest {

  ['@test it can render a basic component']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@htmlbars it can have a custom id and it is not bound']() {
    this.registerComponent('foo-bar', { template: '{{id}} {{elementId}}' });

    this.render('{{foo-bar id=customId}}', {
      customId: 'bizz'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { id: 'bizz' }, content: 'bizz bizz' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { id: 'bizz' }, content: 'bizz bizz' });

    this.runTask(() => set(this.context, 'customId', 'bar'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { id: 'bizz' }, content: 'bar bizz' });

    this.runTask(() => set(this.context, 'customId', 'bizz'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { id: 'bizz' }, content: 'bizz bizz' });
  }

  ['@htmlbars elementId cannot change'](assert) {
    let component;
    let FooBarComponent = Component.extend({
      elementId: 'blahzorz',
      init() {
        this._super(...arguments);
        component = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{elementId}}' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { id: 'blahzorz' }, content: 'blahzorz' });

    if (EmberDev && !EmberDev.runningProdBuild) {
      let willThrow = () => set(component, 'elementId', 'herpyderpy');

      assert.throws(willThrow, /Changing a view's elementId after creation is not allowed/);

      this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { id: 'blahzorz' }, content: 'blahzorz' });
    }
  }

  ['@test it can have a custom tagName']() {
    let FooBarComponent = Component.extend({
      tagName: 'foo-bar'
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { tagName: 'foo-bar', content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'foo-bar', content: 'hello' });
  }

  ['@test it can have a custom tagName set in the constructor']() {
    let FooBarComponent = Component.extend({
      init() {
        this._super();
        this.tagName = 'foo-bar';
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { tagName: 'foo-bar', content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'foo-bar', content: 'hello' });
  }

  ['@test it can have a custom tagName from the invocation']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    this.render('{{foo-bar tagName="foo-bar"}}');

    this.assertComponentElement(this.firstChild, { tagName: 'foo-bar', content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'foo-bar', content: 'hello' });
  }

  ['@test it can have custom classNames']() {
    let FooBarComponent = Component.extend({
      classNames: ['foo', 'bar']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo bar') }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo bar') }, content: 'hello' });
  }

  ['@htmlbars it should apply classBinding without condition always']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    this.render('{{foo-bar classBinding=":foo"}}');

    this.assertComponentElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo  ember-view') } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'class': classes('foo  ember-view') } });
  }

  ['@htmlbars should not apply falsy class name']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    this.render('{{foo-bar class=somethingFalsy}}', {
      somethingFalsy: false
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { class: 'ember-view' }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { class: 'ember-view' }, content: 'hello' });
  }

  ['@test it can have custom classNames from constructor']() {
    let FooBarComponent = Component.extend({
      init() {
        this._super();
        this.classNames.push('foo', 'bar', `outside-${this.get('extraClass')}`);
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar extraClass="baz"}}');

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo bar outside-baz') }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo bar outside-baz') }, content: 'hello' });
  }

  ['@test it can set custom classNames from the invocation']() {
    let FooBarComponent = Component.extend({
      classNames: ['foo']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render(strip`
      {{foo-bar class="bar baz"}}
      {{foo-bar classNames="bar baz"}}
      {{foo-bar}}
    `);

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view foo bar baz') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view foo bar baz') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view foo') }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view foo bar baz') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view foo bar baz') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view foo') }, content: 'hello' });
  }

  ['@test it can have class name bindings']() {
    let FooBarComponent = Component.extend({
      classNameBindings: ['foo', 'isEnabled:enabled', 'isHappy:happy:sad']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar foo=foo isEnabled=isEnabled isHappy=isHappy}}', { foo: 'foo', isEnabled: true, isHappy: false });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled sad') }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled sad') }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'FOO');
      set(this.context, 'isEnabled', false);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view FOO sad') }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', undefined);
      set(this.context, 'isHappy', true);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view happy') }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'foo');
      set(this.context, 'isEnabled', true);
      set(this.context, 'isHappy', false);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled sad') }, content: 'hello' });
  }

  ['@test it can set class name bindings in the constructor']() {
    let FooBarComponent = Component.extend({
      classNameBindings: ['foo'],

      init() {
        this._super();

        let bindings = this.classNameBindings;

        if (this.get('bindIsEnabled')) {
          bindings.push('isEnabled:enabled');
        }

        if (this.get('bindIsHappy')) {
          bindings.push('isHappy:happy:sad');
        }
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render(strip`
      {{foo-bar foo=foo bindIsEnabled=true isEnabled=isEnabled bindIsHappy=false isHappy=isHappy}}
      {{foo-bar foo=foo bindIsEnabled=false isEnabled=isEnabled bindIsHappy=true isHappy=isHappy}}
      {{foo-bar foo=foo bindIsEnabled=true isEnabled=isEnabled bindIsHappy=true isHappy=isHappy}}
      {{foo-bar foo=foo bindIsEnabled=false isEnabled=isEnabled bindIsHappy=false isHappy=isHappy}}
    `, { foo: 'foo', isEnabled: true, isHappy: false });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view foo sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { 'class': classes('ember-view foo') }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view foo sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { 'class': classes('ember-view foo') }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'FOO');
      set(this.context, 'isEnabled', false);
    });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view FOO') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view FOO sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view FOO sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { 'class': classes('ember-view FOO') }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', undefined);
      set(this.context, 'isHappy', true);
    });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view happy') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view happy') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { 'class': classes('ember-view') }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'foo');
      set(this.context, 'isEnabled', true);
      set(this.context, 'isHappy', false);
    });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'class': classes('ember-view foo sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'class': classes('ember-view foo enabled sad') }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { 'class': classes('ember-view foo') }, content: 'hello' });
  }

  ['@test it can have attribute bindings']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['foo:data-foo', 'bar:data-bar']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar foo=foo bar=bar}}', { foo: 'foo', bar: 'bar' });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'foo', 'data-bar': 'bar' }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'foo', 'data-bar': 'bar' }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'FOO');
      set(this.context, 'bar', undefined);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'FOO' }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'foo');
      set(this.context, 'bar', 'bar');
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'foo', 'data-bar': 'bar' }, content: 'hello' });
  }

  ['@test it can set attribute bindings in the constructor']() {
    let FooBarComponent = Component.extend({
      init() {
        this._super();

        let bindings = [];

        if (this.get('hasFoo')) {
          bindings.push('foo:data-foo');
        }

        if (this.get('hasBar')) {
          bindings.push('bar:data-bar');
        }

        this.attributeBindings = bindings;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render(strip`
      {{foo-bar hasFoo=true foo=foo hasBar=false bar=bar}}
      {{foo-bar hasFoo=false foo=foo hasBar=true bar=bar}}
      {{foo-bar hasFoo=true foo=foo hasBar=true bar=bar}}
      {{foo-bar hasFoo=false foo=foo hasBar=false bar=bar}}
    `, { foo: 'foo', bar: 'bar' });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'data-foo': 'foo' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'data-bar': 'bar' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'data-foo': 'foo', 'data-bar': 'bar' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'data-foo': 'foo' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'data-bar': 'bar' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'data-foo': 'foo', 'data-bar': 'bar' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'FOO');
      set(this.context, 'bar', undefined);
    });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'data-foo': 'FOO' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'data-foo': 'FOO' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => set(this.context, 'bar', 'BAR'));

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'data-foo': 'FOO' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'data-bar': 'BAR' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'data-foo': 'FOO', 'data-bar': 'BAR' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'foo', 'foo');
      set(this.context, 'bar', 'bar');
    });

    this.assertComponentElement(this.nthChild(0), { tagName: 'div', attrs: { 'data-foo': 'foo' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(1), { tagName: 'div', attrs: { 'data-bar': 'bar' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(2), { tagName: 'div', attrs: { 'data-foo': 'foo', 'data-bar': 'bar' }, content: 'hello' });
    this.assertComponentElement(this.nthChild(3), { tagName: 'div', attrs: { }, content: 'hello' });
  }

  ['@htmlbars it should not allow attributeBindings to be set']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    expectAssertion(() => {
      this.render('{{foo-bar attributeBindings="one two"}}');
    }, /Setting 'attributeBindings' via template helpers is not allowed/);
  }

  ['@test it has an element']() {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        this._super();
        instance = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    let element1 = instance.element;

    this.assertComponentElement(element1, { content: 'hello' });

    this.runTask(() => this.rerender());

    let element2 = instance.element;

    this.assertComponentElement(element2, { content: 'hello' });

    this.assertSameNode(element2, element1);
  }

  ['@test it has a jQuery proxy to the element'](assert) {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        this._super();
        instance = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    let element1 = instance.$()[0];

    this.assertComponentElement(element1, { content: 'hello' });

    this.runTask(() => this.rerender());

    let element2 = instance.$()[0];

    this.assertComponentElement(element2, { content: 'hello' });

    this.assertSameNode(element2, element1);
  }

  ['@test it scopes the jQuery proxy to the component element'](assert) {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        this._super();
        instance = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '<span class="inner">inner</span>' });

    this.render('<span class="outer">outer</span>{{foo-bar}}');

    let $span = instance.$('span');

    assert.equal($span.length, 1);
    assert.equal($span.attr('class'), 'inner');

    this.runTask(() => this.rerender());

    $span = instance.$('span');

    assert.equal($span.length, 1);
    assert.equal($span.attr('class'), 'inner');
  }

  ['@test an empty component does not have childNodes'](assert) {
    let fooBarInstance;
    let FooBarComponent = Component.extend({
      tagName: 'input',
      init() {
        this._super();
        fooBarInstance = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { tagName: 'input' });

    assert.strictEqual(fooBarInstance.element.childNodes.length, 0);

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'input' });

    assert.strictEqual(fooBarInstance.element.childNodes.length, 0);
  }

  ['@test it has the right parentView and childViews'](assert) {
    let fooBarInstance, fooBarBazInstance;

    let FooBarComponent = Component.extend({
      init() {
        this._super();
        fooBarInstance = this;
      }
    });

    let FooBarBazComponent = Component.extend({
      init() {
        this._super();
        fooBarBazInstance = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'foo-bar {{foo-bar-baz}}' });
    this.registerComponent('foo-bar-baz', { ComponentClass: FooBarBazComponent, template: 'foo-bar-baz' });

    this.render('{{foo-bar}}');
    this.assertText('foo-bar foo-bar-baz');

    assert.equal(fooBarInstance.parentView, this.component);
    assert.equal(fooBarBazInstance.parentView, fooBarInstance);

    assert.deepEqual(this.component.childViews, [fooBarInstance]);
    assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);

    this.runTask(() => this.rerender());
    this.assertText('foo-bar foo-bar-baz');

    assert.equal(fooBarInstance.parentView, this.component);
    assert.equal(fooBarBazInstance.parentView, fooBarInstance);

    assert.deepEqual(this.component.childViews, [fooBarInstance]);
    assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);
  }

  ['@test it can render a basic component with a block']() {
    this.registerComponent('foo-bar', { template: '{{yield}}' });

    this.render('{{#foo-bar}}hello{{/foo-bar}}');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@test it renders the layout with the component instance as the context']() {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        this._super();
        instance = this;
        this.set('message', 'hello');
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{message}}' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => set(instance, 'message', 'goodbye'));

    this.assertComponentElement(this.firstChild, { content: 'goodbye' });

    this.runTask(() => set(instance, 'message', 'hello'));

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@test it preserves the outer context when yielding']() {
    this.registerComponent('foo-bar', { template: '{{yield}}' });

    this.render('{{#foo-bar}}{{message}}{{/foo-bar}}', { message: 'hello' });

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => set(this.context, 'message', 'goodbye'));

    this.assertComponentElement(this.firstChild, { content: 'goodbye' });

    this.runTask(() => set(this.context, 'message', 'hello'));

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@test the component and its child components are destroyed'](assert) {
    let destroyed = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

    this.registerComponent('foo-bar', {
      template: '{{id}} {{yield}}',
      ComponentClass: Component.extend({
        willDestroy() {
          this._super();
          destroyed[this.get('id')]++;
        }
      })
    });

    this.render(strip`
      {{#if cond1}}
        {{#foo-bar id=1}}
          {{#if cond2}}
            {{#foo-bar id=2}}{{/foo-bar}}
            {{#if cond3}}
              {{#foo-bar id=3}}
                {{#if cond4}}
                  {{#foo-bar id=4}}
                    {{#if cond5}}
                      {{#foo-bar id=5}}{{/foo-bar}}
                      {{#foo-bar id=6}}{{/foo-bar}}
                      {{#foo-bar id=7}}{{/foo-bar}}
                    {{/if}}
                    {{#foo-bar id=8}}{{/foo-bar}}
                  {{/foo-bar}}
                {{/if}}
              {{/foo-bar}}
            {{/if}}
          {{/if}}
        {{/foo-bar}}
      {{/if}}`,
      {
        cond1: true,
        cond2: true,
        cond3: true,
        cond4: true,
        cond5: true
      }
    );

    this.assertText('1 2 3 4 5 6 7 8 ');

    this.runTask(() => this.rerender());

    assert.deepEqual(destroyed, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });

    this.runTask(() => set(this.context, 'cond5', false));

    this.assertText('1 2 3 4 8 ');

    assert.deepEqual(destroyed, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 1, 7: 1, 8: 0 });

    this.runTask(() => {
      set(this.context, 'cond3', false);
      set(this.context, 'cond5', true);
      set(this.context, 'cond4', false);
    });

    assert.deepEqual(destroyed, { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 });

    this.runTask(() => {
      set(this.context, 'cond2', false);
      set(this.context, 'cond1', false);
    });

    assert.deepEqual(destroyed, { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 });
  }

  ['@test should escape HTML in normal mustaches']() {
    let component;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        component = this;
      },
      output: 'you need to be more <b>bold</b>'
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{output}}' });

    this.render('{{foo-bar}}');

    this.assertText('you need to be more <b>bold</b>');

    this.runTask(() => this.rerender());

    this.assertText('you need to be more <b>bold</b>');

    this.runTask(() => set(component, 'output', 'you are so <i>super</i>'));

    this.assertText('you are so <i>super</i>');

    this.runTask(() => set(component, 'output', 'you need to be more <b>bold</b>'));
  }

  ['@htmlbars should not escape HTML in triple mustaches'](assert) {
    let component;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        component = this;
      },
      output: 'you need to be more <b>bold</b>'
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{{output}}}' });

    this.render('{{foo-bar}}');

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'b', content: 'bold' });

    this.runTask(() => this.rerender());

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'b', content: 'bold' });

    this.runTask(() => set(component, 'output', 'you are so <i>super</i>'));

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'i', content: 'super' });

    this.runTask(() => set(component, 'output', 'you need to be more <b>bold</b>'));

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'b', content: 'bold' });
  }

  ['@htmlbars should not escape HTML if string is a htmlSafe'](assert) {
    let component;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        component = this;
      },
      output: htmlSafe('you need to be more <b>bold</b>')
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{output}}' });

    this.render('{{foo-bar}}');

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'b', content: 'bold' });

    this.runTask(() => this.rerender());

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'b', content: 'bold' });

    this.runTask(() => set(component, 'output', htmlSafe('you are so <i>super</i>')));

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'i', content: 'super' });

    this.runTask(() => set(component, 'output', htmlSafe('you need to be more <b>bold</b>')));

    assert.strictEqual(this.firstChild.childNodes.length, 4);

    this.assertElement(this.firstChild.childNodes[2], { tagName: 'b', content: 'bold' });
  }
});
