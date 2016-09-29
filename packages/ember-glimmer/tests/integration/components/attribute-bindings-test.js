import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { set } from 'ember-metal';

moduleFor('Attribute bindings integration', class extends RenderingTest {
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

  ['@test it can have attribute bindings with attrs']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['attrs.foo:data-foo', 'attrs.baz.bar:data-bar']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar foo=model.foo baz=model.baz}}', {
      model: { foo: undefined, baz: { bar: 'bar' } }
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'data-bar': 'bar' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'data-bar': 'bar' } });

    this.runTask(() => {
      set(this.context, 'model.foo', 'foo');
      set(this.context, 'model.baz.bar', undefined);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'foo' }, content: 'hello' });

    this.runTask(() => set(this.context, 'model', {
      foo: undefined, baz: { bar: 'bar' }
    }));

    this.assertComponentElement(this.firstChild, { tagName: 'div', content: 'hello', attrs: { 'data-bar': 'bar' } });
  }

  ['@test it can have attribute bindings with a nested path']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['foo.bar:data-foo-bar']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar foo=foo}}', { foo: { bar: 'foo-bar' } });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo-bar': 'foo-bar' }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo-bar': 'foo-bar' }, content: 'hello' });

    this.runTask(() => set(this.context, 'foo.bar', 'FOO-BAR'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo-bar': 'FOO-BAR' }, content: 'hello' });

    this.runTask(() => set(this.context, 'foo.bar', undefined));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => set(this.context, 'foo', undefined));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => set(this.context, 'foo', { bar: 'foo-bar' }));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo-bar': 'foo-bar' }, content: 'hello' });
  }

  ['@test handles non-microsyntax attributeBindings']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['type']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar type=submit}}', {
      submit: 'submit'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'submit' }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'submit' }, content: 'hello' });

    this.runTask(() => set(this.context, 'submit', 'password'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'password' }, content: 'hello' });

    this.runTask(() => set(this.context, 'submit', null));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { }, content: 'hello' });

    this.runTask(() => set(this.context, 'submit', 'submit'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'submit' }, content: 'hello' });
  }

  ['@test non-microsyntax attributeBindings cannot contain nested paths']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['foo.bar']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    expectAssertion(() => {
      this.render('{{foo-bar foo=foo}}', { foo: { bar: 'foo-bar' } });
    }, /Illegal attributeBinding: 'foo.bar' is not a valid attribute name./);
  }

  ['@test normalizes attributeBindings for property names']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['tiTLe']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar tiTLe=name}}', {
      name: 'qux'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { title: 'qux' }, content: 'hello' });

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'name', null));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: {}, content: 'hello' });

    this.runTask(() => set(this.context, 'name', 'qux'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { title: 'qux' }, content: 'hello' });
  }

  ['@test normalizes attributeBindings for attribute names']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['foo:data-FOO']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar foo=foo}}', {
      foo: 'qux'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'qux' }, content: 'hello' });

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'foo', null));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: {}, content: 'hello' });

    this.runTask(() => set(this.context, 'foo', 'qux'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'data-foo': 'qux' }, content: 'hello' });
  }

  ['@test attributeBindings handles null/undefined']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['fizz', 'bar']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar fizz=fizz bar=bar}}', {
      fizz: null,
      bar: undefined
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: {}, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: {}, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'fizz', 'fizz');
      set(this.context, 'bar', 'bar');
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { fizz: 'fizz', bar: 'bar' }, content: 'hello' });

    this.runTask(() => {
      set(this.context, 'fizz', null);
      set(this.context, 'bar', undefined);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: {}, content: 'hello' });
  }

  ['@test attributeBindings handles number value']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['size']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar size=size}}', {
      size: 21
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { size: '21' }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { size: '21' }, content: 'hello' });

    this.runTask(() => set(this.context, 'size', 0));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { size: '0' }, content: 'hello' });

    this.runTask(() => set(this.context, 'size', 21));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { size: '21' }, content: 'hello' });
  }

  ['@test handles internal and external changes']() {
    let component;
    let FooBarComponent = Component.extend({
      attributeBindings: ['type'],
      type: 'password',
      init() {
        this._super(...arguments);
        component = this;
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'password' }, content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'password' }, content: 'hello' });

    this.runTask(() => set(component, 'type', 'checkbox'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'checkbox' }, content: 'hello' });

    this.runTask(() => set(component, 'type', 'password'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { type: 'password' }, content: 'hello' });
  }

  ['@test can set attributeBindings on component with a different tagName']() {
    let FooBarComponent = Component.extend({
      tagName: 'input',
      attributeBindings: ['type', 'isDisabled:disabled']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render('{{foo-bar type=type isDisabled=disabled}}', {
      type: 'password',
      disabled: false
    });

    this.assertComponentElement(this.firstChild, { tagName: 'input', attrs: { type: 'password' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'input', attrs: { type: 'password' } });

    this.runTask(() => {
      set(this.context, 'type', 'checkbox');
      set(this.context, 'disabled', true);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'input', attrs: { type: 'checkbox', disabled: '' } });

    this.runTask(() => {
      set(this.context, 'type', 'password');
      set(this.context, 'disabled', false);
    });

    this.assertComponentElement(this.firstChild, { tagName: 'input', attrs: { type: 'password' } });
  }

  ['@test should allow namespaced attributes in micro syntax']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['xlinkHref:xlink:href']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render('{{foo-bar type=type xlinkHref=xlinkHref}}', {
      xlinkHref: '/foo.png'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'xlink:href': '/foo.png' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'xlink:href': '/foo.png' } });

    this.runTask(() => set(this.context, 'xlinkHref', '/lol.png'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'xlink:href': '/lol.png' } });

    this.runTask(() => set(this.context, 'xlinkHref', '/foo.png'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'xlink:href': '/foo.png' } });
  }

  // This comes into play when using the {{#each}} helper. If the
  // passed array item is a String, it will be converted into a
  // String object instead of a normal string.
  ['@test should allow for String objects']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['foo']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render('{{foo-bar foo=foo}}', {
      foo: (function() { return this; }).call('bar')
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'foo': 'bar' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'foo': 'bar' } });

    this.runTask(() => set(this.context, 'foo', (function() { return this; }).call('baz')));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'foo': 'baz' } });

    this.runTask(() => set(this.context, 'foo', (function() { return this; }).call('bar')));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'foo': 'bar' } });
  }

  ['@test can set id initially via attributeBindings ']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['specialSauce:id']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

    this.render('{{foo-bar specialSauce=sauce}}', {
      sauce: 'special-sauce'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'id': 'special-sauce' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'id': 'special-sauce' } });

    this.runTask(() => set(this.context, 'sauce', 'foo'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'id': 'special-sauce' } });

    this.runTask(() => set(this.context, 'sauce', 'special-sauce'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { 'id': 'special-sauce' } });
  }

  ['@test attributeBindings are overwritten']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['href'],
      href: 'a href'
    });

    let FizzBarComponent = FooBarComponent.extend({
      attributeBindings: ['newHref:href']
    });

    this.registerComponent('fizz-bar', { ComponentClass: FizzBarComponent });

    this.render('{{fizz-bar newHref=href}}', {
      href: 'dog.html'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { href: 'dog.html' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { href: 'dog.html' } });

    this.runTask(() => set(this.context, 'href', 'cat.html'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { href: 'cat.html' } });
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

  ['@test it should not allow attributeBindings to be set']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    expectAssertion(() => {
      this.render('{{foo-bar attributeBindings="one two"}}');
    }, /Setting 'attributeBindings' via template helpers is not allowed/);
  }

  ['@test asserts if an attributeBinding is setup on class']() {
    let FooBarComponent = Component.extend({
      attributeBindings: ['class']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    expectAssertion(() => {
      this.render('{{foo-bar}}');
    }, /You cannot use class as an attributeBinding, use classNameBindings instead./i);
  }

  ['@test blacklists href bindings based on protocol']() {
    /* jshint scripturl:true */

    let FooBarComponent = Component.extend({
      tagName: 'a',
      attributeBindings: ['href']
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar href=xss}}', {
      xss: 'javascript:alert(\'foo\')'
    });

    this.assertComponentElement(this.firstChild, { tagName: 'a', attrs: { href: 'unsafe:javascript:alert(\'foo\')' } });
  }

  ['@test it can bind the role attribute (issue #14007)']() {
    let FooBarComponent = Component.extend({ attributeBindings: ['role'] });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar role=role}}', { role: 'button' });

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { role: 'button' } });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { role: 'button' } });

    this.runTask(() => set(this.context, 'role', 'combobox'));

    this.assertComponentElement(this.firstChild, { tagName: 'div', attrs: { role: 'combobox' } });

    this.runTask(() => set(this.context, 'role', null));

    this.assertComponentElement(this.firstChild, { tagName: 'div' });
  }

  ['@test component with an `id` attribute binding of undefined']() {
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        attributeBindings: ['id'],

        id: undefined
      })
    });

    this.registerComponent('baz-qux', {
      ComponentClass: Component.extend({
        attributeBindings: ['somethingUndefined:id'],

        somethingUndefined: undefined
      })
    });
    this.render(`{{foo-bar}}{{baz-qux}}`);

    this.assertComponentElement(this.nthChild(0), { content: '' });
    this.assertComponentElement(this.nthChild(1), { content: '' });

    this.assert.ok(this.nthChild(0).id.match(/ember\d+/), 'a valid `id` was used');
    this.assert.ok(this.nthChild(1).id.match(/ember\d+/), 'a valid `id` was used');
  }

  ['@test component with an `id` attribute binding of null']() {
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        attributeBindings: ['id'],

        id: null
      })
    });

    this.registerComponent('baz-qux', {
      ComponentClass: Component.extend({
        attributeBindings: ['somethingNull:id'],

        somethingNull: null
      })
    });
    this.render(`{{foo-bar}}{{baz-qux}}`);

    this.assertComponentElement(this.nthChild(0), { content: '' });
    this.assertComponentElement(this.nthChild(1), { content: '' });

    this.assert.ok(this.nthChild(0).id.match(/ember\d+/), 'a valid `id` was used');
    this.assert.ok(this.nthChild(1).id.match(/ember\d+/), 'a valid `id` was used');
  }
});
