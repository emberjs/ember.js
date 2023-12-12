import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Attribute bindings integration',
  class extends RenderingTestCase {
    ['@test it can have attribute bindings']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['foo:data-foo', 'bar:data-bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar foo=this.foo bar=this.bar}}', { foo: 'foo', bar: 'bar' });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'bar', undefined);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
    }

    ['@test it can have attribute bindings with attrs']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['attrs.foo:data-foo', 'attrs.baz.bar:data-bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar foo=this.model.foo baz=this.model.baz}}', {
        model: { foo: undefined, baz: { bar: 'bar' } },
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { 'data-bar': 'bar' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { 'data-bar': 'bar' },
      });

      runTask(() => {
        set(this.context, 'model.foo', 'foo');
        set(this.context, 'model.baz.bar', undefined);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo' },
        content: 'hello',
      });

      runTask(() =>
        set(this.context, 'model', {
          foo: undefined,
          baz: { bar: 'bar' },
        })
      );

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        content: 'hello',
        attrs: { 'data-bar': 'bar' },
      });
    }

    ['@test it can have attribute bindings with a nested path']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['foo.bar:data-foo-bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar foo=this.foo}}', { foo: { bar: 'foo-bar' } });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo-bar': 'foo-bar' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo-bar': 'foo-bar' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'foo.bar', 'FOO-BAR'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo-bar': 'FOO-BAR' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'foo.bar', undefined));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => set(this.context, 'foo', undefined));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => set(this.context, 'foo', { bar: 'foo-bar' }));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo-bar': 'foo-bar' },
        content: 'hello',
      });
    }

    ['@test handles non-microsyntax attributeBindings']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['type'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar type=this.submit}}', {
        submit: 'submit',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'submit' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'submit' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'submit', 'password'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'password' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'submit', null));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => set(this.context, 'submit', 'submit'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'submit' },
        content: 'hello',
      });
    }

    ['@test non-microsyntax attributeBindings cannot contain nested paths']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['foo.bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar foo=this.foo}}', { foo: { bar: 'foo-bar' } });
      }, /Illegal attributeBinding: 'foo.bar' is not a valid attribute name./);
    }

    ['@test normalizes attributeBindings for property names']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['tiTLe'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar tiTLe=this.name}}', {
        name: 'qux',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { title: 'qux' },
        content: 'hello',
      });

      this.assertStableRerender();

      runTask(() => set(this.context, 'name', null));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => set(this.context, 'name', 'qux'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { title: 'qux' },
        content: 'hello',
      });
    }

    ['@test normalizes attributeBindings for attribute names']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['foo:data-FOO'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar foo=this.foo}}', {
        foo: 'qux',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'qux' },
        content: 'hello',
      });

      this.assertStableRerender();

      runTask(() => set(this.context, 'foo', null));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => set(this.context, 'foo', 'qux'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'qux' },
        content: 'hello',
      });
    }

    ['@test  attributeBindings preserves case for mixed-case attributes']() {
      let FooBarComponent = Component.extend({
        tagName: 'svg',
        attributeBindings: ['viewBox'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '',
      });

      this.render('{{foo-bar viewBox=this.foo}}', {
        foo: '0 0 100 100',
      });

      this.assert.equal(
        this.firstChild.getAttribute('viewBox'),
        '0 0 100 100',
        'viewBox attribute'
      );

      this.assertStableRerender();

      runTask(() => set(this.context, 'foo', null));

      this.assert.ok(!this.firstChild.hasAttribute('viewBox'), 'viewBox attribute removed');

      runTask(() => set(this.context, 'foo', '0 0 100 200'));

      this.assert.equal(
        this.firstChild.getAttribute('viewBox'),
        '0 0 100 200',
        'viewBox attribute'
      );
    }

    ['@test attributeBindings handles null/undefined']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['fizz', 'bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar fizz=this.fizz bar=this.bar}}', {
        fizz: null,
        bar: undefined,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'fizz', 'fizz');
        set(this.context, 'bar', 'bar');
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { fizz: 'fizz', bar: 'bar' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'fizz', null);
        set(this.context, 'bar', undefined);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });
    }

    ['@test attributeBindings handles number value']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['size'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar size=this.size}}', {
        size: 21,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { size: '21' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { size: '21' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'size', 0));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { size: '0' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'size', 21));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { size: '21' },
        content: 'hello',
      });
    }

    ['@test handles internal and external changes']() {
      let component;
      let FooBarComponent = Component.extend({
        attributeBindings: ['type'],
        type: 'password',
        init() {
          this._super(...arguments);
          component = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'password' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'password' },
        content: 'hello',
      });

      runTask(() => set(component, 'type', 'checkbox'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'checkbox' },
        content: 'hello',
      });

      runTask(() => set(component, 'type', 'password'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { type: 'password' },
        content: 'hello',
      });
    }

    ['@test can set attributeBindings on component with a different tagName']() {
      let FooBarComponent = Component.extend({
        tagName: 'input',
        attributeBindings: ['type', 'isDisabled:disabled'],
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar type=this.type isDisabled=this.disabled}}', {
        type: 'password',
        disabled: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: { type: 'password' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: { type: 'password' },
      });

      runTask(() => {
        set(this.context, 'type', 'checkbox');
        set(this.context, 'disabled', true);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: { type: 'checkbox', disabled: '' },
      });

      runTask(() => {
        set(this.context, 'type', 'password');
        set(this.context, 'disabled', false);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'input',
        attrs: { type: 'password' },
      });
    }

    ['@test should allow namespaced attributes in micro syntax']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['xlinkHref:xlink:href'],
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar type=this.type xlinkHref=this.xlinkHref}}', {
        xlinkHref: '/foo.png',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'xlink:href': '/foo.png' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'xlink:href': '/foo.png' },
      });

      runTask(() => set(this.context, 'xlinkHref', '/lol.png'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'xlink:href': '/lol.png' },
      });

      runTask(() => set(this.context, 'xlinkHref', '/foo.png'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'xlink:href': '/foo.png' },
      });
    }

    // This comes into play when using the {{#each}} helper. If the
    // passed array item is a String, it will be converted into a
    // String object instead of a normal string.
    ['@test should allow for String objects']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['foo'],
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar foo=this.foo}}', {
        foo: function () {
          return this;
        }.call('bar'),
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { foo: 'bar' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { foo: 'bar' },
      });

      runTask(() =>
        set(
          this.context,
          'foo',
          function () {
            return this;
          }.call('baz')
        )
      );

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { foo: 'baz' },
      });

      runTask(() =>
        set(
          this.context,
          'foo',
          function () {
            return this;
          }.call('bar')
        )
      );

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { foo: 'bar' },
      });
    }

    ['@test can set id initially via attributeBindings ']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['specialSauce:id'],
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar specialSauce=this.sauce}}', {
        sauce: 'special-sauce',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'special-sauce' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'special-sauce' },
      });

      runTask(() => set(this.context, 'sauce', 'foo'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'special-sauce' },
      });

      runTask(() => set(this.context, 'sauce', 'special-sauce'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'special-sauce' },
      });
    }

    ['@test attributeBindings are overwritten']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['href'],
        href: 'a href',
      });

      let FizzBarComponent = FooBarComponent.extend({
        attributeBindings: ['newHref:href'],
      });

      this.registerComponent('fizz-bar', { ComponentClass: FizzBarComponent });

      this.render('{{fizz-bar newHref=this.href}}', {
        href: 'dog.html',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { href: 'dog.html' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { href: 'dog.html' },
      });

      runTask(() => set(this.context, 'href', 'cat.html'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { href: 'cat.html' },
      });
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
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render(
        strip`
      {{foo-bar hasFoo=true foo=this.foo hasBar=false bar=this.bar}}
      {{foo-bar hasFoo=false foo=this.foo hasBar=true bar=this.bar}}
      {{foo-bar hasFoo=true foo=this.foo hasBar=true bar=this.bar}}
      {{foo-bar hasFoo=false foo=this.foo hasBar=false bar=this.bar}}
    `,
        { foo: 'foo', bar: 'bar' }
      );

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { 'data-foo': 'foo' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { 'data-foo': 'foo' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'bar', undefined);
      });

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => set(this.context, 'bar', 'BAR'));

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { 'data-bar': 'BAR' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO', 'data-bar': 'BAR' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
      });

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { 'data-foo': 'foo' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: {},
        content: 'hello',
      });
    }

    ['@test asserts if an attributeBinding is setup on class']() {
      let FooBarComponent = Component.extend({
        attributeBindings: ['class'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You cannot use class as an attributeBinding, use classNameBindings instead./i);
    }

    ['@test blacklists href bindings based on protocol']() {
      let FooBarComponent = Component.extend({
        tagName: 'a',
        attributeBindings: ['href'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar href=this.xss}}', {
        xss: "javascript:alert('foo')",
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'a',
        attrs: { href: "unsafe:javascript:alert('foo')" },
      });
    }

    ['@test it can bind the role attribute (issue #14007)']() {
      let FooBarComponent = Component.extend({ attributeBindings: ['role'] });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar role=this.role}}', { role: 'button' });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { role: 'button' },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { role: 'button' },
      });

      runTask(() => set(this.context, 'role', 'combobox'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { role: 'combobox' },
      });

      runTask(() => set(this.context, 'role', null));

      this.assertComponentElement(this.firstChild, { tagName: 'div' });
    }

    ['@test component with an `id` attribute binding of undefined']() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          attributeBindings: ['id'],

          id: undefined,
        }),
      });

      this.registerComponent('baz-qux', {
        ComponentClass: Component.extend({
          attributeBindings: ['somethingUndefined:id'],

          somethingUndefined: undefined,
        }),
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

          id: null,
        }),
      });

      this.registerComponent('baz-qux', {
        ComponentClass: Component.extend({
          attributeBindings: ['somethingNull:id'],

          somethingNull: null,
        }),
      });
      this.render(`{{foo-bar}}{{baz-qux}}`);

      this.assertComponentElement(this.nthChild(0), { content: '' });
      this.assertComponentElement(this.nthChild(1), { content: '' });

      this.assert.ok(this.nthChild(0).id.match(/ember\d+/), 'a valid `id` was used');
      this.assert.ok(this.nthChild(1).id.match(/ember\d+/), 'a valid `id` was used');
    }
  }
);
