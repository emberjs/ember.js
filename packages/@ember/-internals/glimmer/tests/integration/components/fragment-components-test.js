import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Components test: fragment components',
  class extends RenderingTestCase {
    getCustomDispatcherEvents() {
      return {
        hitDem: 'folks',
      };
    }

    ['@test fragments do not render an outer tag']() {
      let instance;
      let FooBarComponent = Component.extend({
        tagName: '',
        init() {
          this._super();
          instance = this;
          this.foo = true;
          this.bar = 'bar';
        },
      });

      let template = `{{#if this.foo}}<div>Hey</div>{{/if}}{{yield this.bar}}`;

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });

      this.render(`{{#foo-bar as |bar|}}{{bar}}{{/foo-bar}}`);

      this.assertHTML(strip`<div>Hey</div>bar`);

      this.assertStableRerender();

      runTask(() => set(instance, 'foo', false));

      this.assertHTML(strip`<!---->bar`);

      runTask(() => set(instance, 'bar', 'bizz'));

      this.assertHTML(strip`<!---->bizz`);

      runTask(() => {
        set(instance, 'bar', 'bar');
        set(instance, 'foo', true);
      });
    }

    ['@test throws an error if an event function is defined in a tagless component']() {
      let template = `hit dem folks`;
      let FooBarComponent = Component.extend({
        tagName: '',
        click() {},
        mouseEnter() {},
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });

      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You can not define `click` function\(s\) to handle DOM event in the .* tagless component since it doesn't have any DOM element./);
    }

    ['@test throws an error if a custom defined event function is defined in a tagless component']() {
      let template = `hit dem folks`;
      let FooBarComponent = Component.extend({
        tagName: '',
        folks() {},
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });

      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You can not define `folks` function\(s\) to handle DOM event in the .* tagless component since it doesn't have any DOM element./);
    }

    ['@test throws an error if `tagName` is an empty string and `classNameBindings` are specified']() {
      let template = `hit dem folks`;
      let FooBarComponent = Component.extend({
        tagName: '',
        foo: true,
        classNameBindings: ['foo:is-foo:is-bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });

      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You cannot use `classNameBindings` on a tag-less component/);
    }

    ['@test throws an error if `tagName` is an empty string and `attributeBindings` are specified']() {
      let template = `hit dem folks`;
      let FooBarComponent = Component.extend({
        tagName: '',
        attributeBindings: ['href'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });
      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You cannot use `attributeBindings` on a tag-less component/);
    }

    ['@test throws an error if `tagName` is an empty string and `elementId` is specified via JS']() {
      let template = `hit dem folks`;
      let FooBarComponent = Component.extend({
        tagName: '',
        elementId: 'turntUp',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });
      expectAssertion(() => {
        this.render(`{{#foo-bar}}{{/foo-bar}}`);
      }, /You cannot use `elementId` on a tag-less component/);
    }

    ['@test throws an error if `tagName` is an empty string and `elementId` is specified via template']() {
      let template = `hit dem folks`;
      let FooBarComponent = Component.extend({
        tagName: '',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });
      expectAssertion(() => {
        this.render(`{{#foo-bar elementId='turntUp'}}{{/foo-bar}}`);
      }, /You cannot use `elementId` on a tag-less component/);
    }

    ['@test does not throw an error if `tagName` is an empty string and `id` is specified via JS']() {
      let template = `{{this.id}}`;
      let FooBarComponent = Component.extend({
        tagName: '',
        id: 'baz',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });
      this.render(`{{#foo-bar}}{{/foo-bar}}`);
      this.assertText('baz');
    }

    ['@test does not throw an error if `tagName` is an empty string and `id` is specified via template']() {
      let template = `{{this.id}}`;
      let FooBarComponent = Component.extend({
        tagName: '',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });
      this.render(`{{#foo-bar id='baz'}}{{/foo-bar}}`);
      this.assertText('baz');
    }

    ['@test does not throw an error if `tagName` is an empty string and `id` is bound property specified via template']() {
      let template = `{{this.id}}`;
      let FooBarComponent = Component.extend({
        tagName: '',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template,
      });

      this.render(`{{#foo-bar id=this.fooBarId}}{{/foo-bar}}`, { fooBarId: 'baz' });

      this.assertText('baz');

      this.assertStableRerender();

      runTask(() => set(this.context, 'fooBarId', 'qux'));

      this.assertText('qux');

      runTask(() => set(this.context, 'fooBarId', 'baz'));

      this.assertText('baz');
    }

    ['@test does not throw an error if `tagName` is an empty string and `id` is specified via template and passed to child component']() {
      let fooBarTemplate = `{{#baz-child id=this.id}}{{/baz-child}}`;
      let FooBarComponent = Component.extend({
        tagName: '',
      });
      let BazChildComponent = Component.extend();
      let bazChildTemplate = `{{this.id}}`;

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: fooBarTemplate,
      });
      this.registerComponent('baz-child', {
        ComponentClass: BazChildComponent,
        template: bazChildTemplate,
      });
      this.render(`{{#foo-bar id='baz'}}{{/foo-bar}}`);
      this.assertText('baz');
    }

    ['@test renders a contained view with omitted start tag and tagless parent view context']() {
      this.registerComponent('root-component', {
        ComponentClass: Component.extend({
          tagName: 'section',
        }),
        template: '{{frag-ment}}',
      });

      this.registerComponent('frag-ment', {
        ComponentClass: Component.extend({
          tagName: '',
        }),
        template: '{{my-span}}',
      });

      this.registerComponent('my-span', {
        ComponentClass: Component.extend({
          tagName: 'span',
        }),
        template: 'dab',
      });

      this.render(`{{root-component}}`);

      this.assertElement(this.firstChild, { tagName: 'section' });
      this.assertElement(this.firstChild.firstElementChild, {
        tagName: 'span',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, { tagName: 'section' });
      this.assertElement(this.firstChild.firstElementChild, {
        tagName: 'span',
      });
    }
  }
);
