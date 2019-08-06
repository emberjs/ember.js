import { moduleFor, RenderingTestCase, strip, classes, runTask } from 'internal-test-helpers';
import { ENV } from '@ember/-internals/environment';
import { setModifierManager } from '@ember/-internals/glimmer';
import { Object as EmberObject } from '@ember/-internals/runtime';

import { set, setProperties } from '@ember/-internals/metal';

import { Component } from '../../utils/helpers';

class CustomModifierManager {
  constructor(owner) {
    this.owner = owner;
  }

  createModifier(factory, args) {
    return factory.create(args);
  }

  installModifier(instance, element, args) {
    instance.element = element;
    let { positional, named } = args;
    instance.didInsertElement(positional, named);
  }

  updateModifier(instance, args) {
    let { positional, named } = args;
    instance.didUpdate(positional, named);
  }

  destroyModifier(instance) {
    instance.willDestroyElement();
  }
}
let BaseModifier = setModifierManager(
  owner => {
    return new CustomModifierManager(owner);
  },
  EmberObject.extend({
    didInsertElement() {},
    didUpdate() {},
    willDestroyElement() {},
  })
);

moduleFor(
  'AngleBracket Invocation',
  class extends RenderingTestCase {
    '@test it can resolve <XBlah /> to x-blah'() {
      this.registerComponent('x-blah', { template: 'hello' });

      this.render('<XBlah />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can resolve <X-Blah /> to x-blah'() {
      this.registerComponent('x-blah', { template: 'hello' });

      this.render('<X-Blah />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic template only component'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic component with template and javascript'() {
      this.registerComponent('foo-bar', {
        template: 'FIZZ BAR {{local}}',
        ComponentClass: Component.extend({ local: 'hey' }),
      });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'FIZZ BAR hey' });
    }

    '@test it can render a single word component name'() {
      this.registerComponent('foo', { template: 'hello' });

      this.render('<Foo />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can not render a component name without initial capital letter'(assert) {
      this.registerComponent('div', {
        ComponentClass: Component.extend({
          init() {
            assert.ok(false, 'should not have created component');
          },
        }),
      });

      this.render('<div></div>');

      this.assertElement(this.firstChild, { tagName: 'div', content: '' });
    }

    '@test it can have a custom id and it is not bound'() {
      this.registerComponent('foo-bar', { template: '{{id}} {{elementId}}' });

      this.render('<FooBar @id={{customId}} />', {
        customId: 'bizz',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });

      this.assertStableRerender();

      runTask(() => set(this.context, 'customId', 'bar'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bar bizz',
      });

      runTask(() => set(this.context, 'customId', 'bizz'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });
    }

    '@test it can have a custom id attribute and it is bound'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar id={{customId}} />', {
        customId: 'bizz',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'hello',
      });

      this.assertStableRerender();

      runTask(() => set(this.context, 'customId', 'bar'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bar' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'customId', 'bizz'));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'hello',
      });
    }

    '@test it can have a custom tagName'() {
      let FooBarComponent = Component.extend({
        tagName: 'foo-bar',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('<FooBar></FooBar>');

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });
    }

    '@test it can have a custom tagName from the invocation'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar @tagName="foo-bar" />');

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'foo-bar',
        content: 'hello',
      });
    }

    '@test it can have custom classNames'() {
      let FooBarComponent = Component.extend({
        classNames: ['foo', 'bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar') },
        content: 'hello',
      });
    }

    '@test class property on components can be dynamic'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('<FooBar @class={{if fooBar "foo-bar"}} />', {
        fooBar: true,
      });

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view foo-bar') },
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view foo-bar') },
      });

      runTask(() => set(this.context, 'fooBar', false));

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view') },
      });

      runTask(() => set(this.context, 'fooBar', true));

      this.assertComponentElement(this.firstChild, {
        content: 'hello',
        attrs: { class: classes('ember-view foo-bar') },
      });
    }

    '@test it can set custom classNames from the invocation'() {
      let FooBarComponent = Component.extend({
        classNames: ['foo'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render(strip`
        <FooBar @class="bar baz" />
        <FooBar @classNames="bar baz" />
        <FooBar />
      `);

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar baz') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });
    }

    '@test it has an element'() {
      let instance;

      let FooBarComponent = Component.extend({
        init() {
          this._super();
          instance = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('<FooBar></FooBar>');

      let element1 = instance.element;

      this.assertComponentElement(element1, { content: 'hello' });

      runTask(() => this.rerender());

      let element2 = instance.element;

      this.assertComponentElement(element2, { content: 'hello' });

      this.assertSameNode(element2, element1);
    }

    '@test it has the right parentView and childViews'(assert) {
      let fooBarInstance, fooBarBazInstance;

      let FooBarComponent = Component.extend({
        init() {
          this._super();
          fooBarInstance = this;
        },
      });

      let FooBarBazComponent = Component.extend({
        init() {
          this._super();
          fooBarBazInstance = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'foo-bar {{foo-bar-baz}}',
      });
      this.registerComponent('foo-bar-baz', {
        ComponentClass: FooBarBazComponent,
        template: 'foo-bar-baz',
      });

      this.render('<FooBar />');
      this.assertText('foo-bar foo-bar-baz');

      assert.equal(fooBarInstance.parentView, this.component);
      assert.equal(fooBarBazInstance.parentView, fooBarInstance);

      assert.deepEqual(this.component.childViews, [fooBarInstance]);
      assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);

      runTask(() => this.rerender());
      this.assertText('foo-bar foo-bar-baz');

      assert.equal(fooBarInstance.parentView, this.component);
      assert.equal(fooBarBazInstance.parentView, fooBarInstance);

      assert.deepEqual(this.component.childViews, [fooBarInstance]);
      assert.deepEqual(fooBarInstance.childViews, [fooBarBazInstance]);
    }

    '@test it renders passed named arguments'() {
      this.registerComponent('foo-bar', {
        template: '{{@foo}}',
      });

      this.render('<FooBar @foo={{model.bar}} />', {
        model: {
          bar: 'Hola',
        },
      });

      this.assertText('Hola');

      runTask(() => this.rerender());

      this.assertText('Hola');

      runTask(() => this.context.set('model.bar', 'Hello'));

      this.assertText('Hello');

      runTask(() => this.context.set('model', { bar: 'Hola' }));

      this.assertText('Hola');
    }

    '@test it reflects named arguments as properties'() {
      this.registerComponent('foo-bar', {
        template: '{{foo}}',
      });

      this.render('<FooBar @foo={{model.bar}} />', {
        model: {
          bar: 'Hola',
        },
      });

      this.assertText('Hola');

      runTask(() => this.rerender());

      this.assertText('Hola');

      runTask(() => this.context.set('model.bar', 'Hello'));

      this.assertText('Hello');

      runTask(() => this.context.set('model', { bar: 'Hola' }));

      this.assertText('Hola');
    }

    '@test it can render a basic component with a block'() {
      this.registerComponent('foo-bar', {
        template: '{{yield}} - In component',
      });

      this.render('<FooBar>hello</FooBar>');

      this.assertComponentElement(this.firstChild, {
        content: 'hello - In component',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'hello - In component',
      });
    }

    '@test it can yield internal and external properties positionally'() {
      let instance;

      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          instance = this;
        },
        greeting: 'hello',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{yield greeting greetee.firstName}}',
      });

      this.render(
        '<FooBar @greetee={{person}} as |greeting name|>{{name}} {{person.lastName}}, {{greeting}}</FooBar>',
        {
          person: {
            firstName: 'Joel',
            lastName: 'Kang',
          },
        }
      );

      this.assertComponentElement(this.firstChild, {
        content: 'Joel Kang, hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'Joel Kang, hello',
      });

      runTask(() =>
        set(this.context, 'person', {
          firstName: 'Dora',
          lastName: 'the Explorer',
        })
      );

      this.assertComponentElement(this.firstChild, {
        content: 'Dora the Explorer, hello',
      });

      runTask(() => set(instance, 'greeting', 'hola'));

      this.assertComponentElement(this.firstChild, {
        content: 'Dora the Explorer, hola',
      });

      runTask(() => {
        set(instance, 'greeting', 'hello');
        set(this.context, 'person', {
          firstName: 'Joel',
          lastName: 'Kang',
        });
      });

      this.assertComponentElement(this.firstChild, {
        content: 'Joel Kang, hello',
      });
    }

    '@test positional parameters are not allowed'() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['first', 'second'],
        }),
        template: '{{first}}{{second}}',
      });

      // this is somewhat silly as the browser "corrects" for these as
      // attribute names, but regardless the thing we care about here is that
      // they are **not** used as positional params
      this.render('<SampleComponent one two />');

      this.assertText('');
    }

    '@test can invoke curried components with capitalized block param names'() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render(strip`
        {{#with (component 'foo-bar') as |Other|}}
          <Other />
        {{/with}}
      `);

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    '@test can invoke curried components with named args'() {
      this.registerComponent('foo-bar', { template: 'hello' });
      this.registerComponent('test-harness', { template: '<@foo />' });
      this.render(strip`{{test-harness foo=(component 'foo-bar')}}`);

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    '@test can invoke curried components with a path'() {
      this.registerComponent('foo-bar', { template: 'hello' });
      this.registerComponent('test-harness', { template: '<this.foo />' });
      this.render(strip`{{test-harness foo=(component 'foo-bar')}}`);

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    '@test can not invoke curried components with an implicit `this` path'(assert) {
      assert.expect(0);
      this.registerComponent('foo-bar', {
        template: 'hello',
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            assert.ok(false, 'should not have instantiated');
          },
        }),
      });
      this.registerComponent('test-harness', {
        template: '<foo.bar />',
      });
      this.render(strip`{{test-harness foo=(hash bar=(component 'foo-bar'))}}`);
    }

    '@test has-block'() {
      this.registerComponent('check-block', {
        template: strip`
          {{#if (has-block)}}
            Yes
          {{else}}
            No
          {{/if}}`,
      });

      this.render(strip`
        <CheckBlock />
        <CheckBlock></CheckBlock>`);

      this.assertComponentElement(this.firstChild, { content: 'No' });
      this.assertComponentElement(this.nthChild(1), { content: 'Yes' });

      this.assertStableRerender();
    }

    '@test includes invocation specified attributes in root element ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend(),
        template: 'hello',
      });

      this.render('<FooBar data-foo={{foo}} data-bar={{bar}} />', { foo: 'foo', bar: 'bar' });

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

    '@test attributes without values passed at invocation are included in `...attributes` ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes>hello</div>',
      });

      this.render('<FooBar data-bar />');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-bar': '' },
        content: 'hello',
      });

      this.assertStableRerender();
    }

    '@test attributes without values at definition are included in `...attributes` ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div data-bar ...attributes>hello</div>',
      });

      this.render('<FooBar />');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-bar': '' },
        content: 'hello',
      });

      this.assertStableRerender();
    }

    '@test includes invocation specified attributes in `...attributes` slot in tagless component ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes>hello</div>',
      });

      this.render('<FooBar data-foo={{foo}} data-bar={{bar}} />', { foo: 'foo', bar: 'bar' });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'bar', undefined);
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
    }

    '@test merges attributes with `...attributes` in tagless component ("splattributes")'() {
      let instance;
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          tagName: '',
          init() {
            instance = this;
            this._super(...arguments);
            this.localProp = 'qux';
          },
        }),
        template: '<div data-derp={{localProp}} ...attributes>hello</div>',
      });

      this.render('<FooBar data-foo={{foo}} data-bar={{bar}} />', { foo: 'foo', bar: 'bar' });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-derp': 'qux', 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-derp': 'qux', 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'bar', undefined);
        set(instance, 'localProp', 'QUZ');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-derp': 'QUZ', 'data-foo': 'FOO' },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
        set(instance, 'localProp', 'qux');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-derp': 'qux', 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
    }

    '@test merges class attribute with `...attributes` in tagless component ("splattributes")'() {
      let instance;
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          tagName: '',
          init() {
            instance = this;
            this._super(...arguments);
            this.localProp = 'qux';
          },
        }),
        template: '<div class={{localProp}} ...attributes>hello</div>',
      });

      this.render('<FooBar class={{bar}} />', { bar: 'bar' });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('qux bar') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('qux bar') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'bar', undefined);
        set(instance, 'localProp', 'QUZ');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('QUZ') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'bar', 'bar');
        set(instance, 'localProp', 'qux');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('qux bar') },
        content: 'hello',
      });
    }

    '@test merges trailing class attribute with `...attributes` in tagless component ("splattributes")'() {
      let instance;
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          tagName: '',
          init() {
            instance = this;
            this._super(...arguments);
            this.localProp = 'qux';
          },
        }),
        template: '<div ...attributes class={{localProp}}>hello</div>',
      });

      this.render('<FooBar class={{bar}} />', { bar: 'bar' });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('bar qux') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('bar qux') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'bar', undefined);
        set(instance, 'localProp', 'QUZ');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('QUZ') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'bar', 'bar');
        set(instance, 'localProp', 'qux');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('bar qux') },
        content: 'hello',
      });
    }

    '@test merges class attribute with `...attributes` in yielded contextual component ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '{{yield (hash baz=(component "foo-bar/baz"))}}',
      });
      this.registerComponent('foo-bar/baz', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div class="default-class" ...attributes>hello</div>',
      });

      this.render('<FooBar as |fb|><fb.baz class="custom-class" title="foo"></fb.baz></FooBar>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('default-class custom-class'), title: 'foo' },
        content: 'hello',
      });
    }

    '@test merges trailing class attribute with `...attributes` in yielded contextual component ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '{{yield (hash baz=(component "foo-bar/baz"))}}',
      });
      this.registerComponent('foo-bar/baz', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes class="default-class" >hello</div>',
      });

      this.render('<FooBar as |fb|><fb.baz class="custom-class" title="foo"></fb.baz></FooBar>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('custom-class default-class'), title: 'foo' },
        content: 'hello',
      });
    }

    '@test the attributes passed on invocation trump over the default ones on elements with `...attributes` in yielded contextual component ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '{{yield (hash baz=(component "foo-bar/baz"))}}',
      });
      this.registerComponent('foo-bar/baz', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div title="bar" ...attributes>hello</div>',
      });

      this.render('<FooBar as |fb|><fb.baz title="foo"></fb.baz></FooBar>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { title: 'foo' },
        content: 'hello',
      });
    }

    '@test can forward ...attributes to dynamic component invocation ("splattributes")'() {
      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<XInner ...attributes>{{yield}}</XInner>',
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes>{{yield}}</div>',
      });

      this.render(strip`
        {{#let (component 'x-outer') as |Thing|}}
          <Thing data-foo>Hello!</Thing>
        {{/let}}
      `);

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': '' },
        content: 'Hello!',
      });
    }

    '@test an inner angle invocation can forward ...attributes through dynamic component invocation ("splattributes")'() {
      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: `{{#let (component 'x-inner') as |Thing|}}<Thing ...attributes>{{yield}}</Thing>{{/let}}`,
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes>{{yield}}</div>',
      });

      this.render('<XOuter data-foo>Hello!</XOuter>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': '' },
        content: 'Hello!',
      });
    }

    '@test an inner angle invocation can forward ...attributes through static component invocation ("splattributes")'() {
      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: `<XInner ...attributes>{{yield}}</XInner>`,
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes>{{yield}}</div>',
      });

      this.render('<XOuter data-foo>Hello!</XOuter>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': '' },
        content: 'Hello!',
      });
    }

    '@test can include `...attributes` in multiple elements in tagless component ("splattributes")'() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div ...attributes>hello</div><p ...attributes>world</p>',
      });

      this.render('<FooBar data-foo={{foo}} data-bar={{bar}} />', { foo: 'foo', bar: 'bar' });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertElement(this.nthChild(1), {
        tagName: 'p',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'world',
      });

      runTask(() => this.rerender());

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertElement(this.nthChild(1), {
        tagName: 'p',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'world',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'bar', undefined);
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'FOO' },
        content: 'hello',
      });
      this.assertElement(this.nthChild(1), {
        tagName: 'p',
        attrs: { 'data-foo': 'FOO' },
        content: 'world',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'bar', 'bar');
      });

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'hello',
      });
      this.assertElement(this.nthChild(1), {
        tagName: 'p',
        attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
        content: 'world',
      });
    }

    '@test can yield content to contextual components invoked with angle-bracket components that receives splattributes'() {
      this.registerComponent('foo-bar/inner', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<h1 ...attributes>{{yield}}</h1>',
      });
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({ tagName: '' }),
        // If <Inner> doesn't receive splattributes this test passes
        template: strip`
          {{#let (component "foo-bar/inner") as |Inner|}}
            <Inner ...attributes>{{yield}}</Inner>
            <h2>Inside the let</h2>
          {{/let}}
          <h3>Outside the let</h3>
        `,
      });

      this.render('<FooBar>Yielded content</FooBar>');
      this.assertElement(this.firstChild, {
        tagName: 'h1',
        attrs: {},
        content: 'Yielded content',
      });
      this.assertElement(this.nthChild(1), {
        tagName: 'h2',
        attrs: {},
        content: 'Inside the let',
      });
      this.assertElement(this.nthChild(2), {
        tagName: 'h3',
        attrs: {},
        content: 'Outside the let',
      });
    }
  }
);

moduleFor(
  'AngleBracket Invocation (splattributes)',
  class extends RenderingTestCase {
    constructor() {
      super(...arguments);
      this._TEMPLATE_ONLY_GLIMMER_COMPONENTS = ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;
    }

    teardown() {
      super.teardown();
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = this._TEMPLATE_ONLY_GLIMMER_COMPONENTS;
    }

    registerComponent(name, template) {
      super.registerComponent(name, { template, ComponentClass: null });
    }

    '@test angle bracket invocation can pass merge ...attributes'() {
      this.registerComponent(
        'qux',
        '<div data-from-qux-before ...attributes data-from-qux-after></div>'
      );
      this.registerComponent(
        'bar',
        '<Qux data-from-bar-before ...attributes data-from-bar-after />'
      );
      this.registerComponent(
        'foo',
        '<Bar data-from-foo-before ...attributes data-from-foo-after />'
      );

      this.render('<Foo data-from-top />');
      this.assertHTML(`<div
        data-from-qux-before=""
        data-from-bar-before=""
        data-from-foo-before=""
        data-from-top=""
        data-from-foo-after=""
        data-from-bar-after=""
        data-from-qux-after=""
      ></div>`);
    }

    '@test angle bracket invocation can allow invocation side to override attributes with ...attributes'() {
      this.registerComponent('qux', '<div id="qux" ...attributes />');
      this.registerComponent('bar', '<Qux id="bar" ...attributes />');
      this.registerComponent('foo', '<Bar id="foo" ...attributes />');

      this.render('<Foo id="top" />');
      this.assertHTML('<div id="top"></div>');
    }

    '@test angle bracket invocation can override invocation side attributes with ...attributes'() {
      this.registerComponent('qux', '<div ...attributes id="qux" />');
      this.registerComponent('bar', '<Qux ...attributes id="bar" />');
      this.registerComponent('foo', '<Bar ...attributes id="foo" />');

      this.render('<Foo id="top" />');
      this.assertHTML('<div id="qux"></div>');
    }

    '@test angle bracket invocation can forward classes before ...attributes to a nested component'() {
      this.registerComponent('qux', '<div class="qux" ...attributes />');
      this.registerComponent('bar', '<Qux class="bar" ...attributes />');
      this.registerComponent('foo', '<Bar class="foo" ...attributes />');

      this.render('<Foo class="top" />');
      this.assertHTML('<div class="qux bar foo top"></div>');
    }

    '@test angle bracket invocation can forward classes after ...attributes to a nested component'() {
      this.registerComponent('qux', '<div ...attributes class="qux" />');
      this.registerComponent('bar', '<Qux ...attributes class="bar" />');
      this.registerComponent('foo', '<Bar ...attributes class="foo" />');

      this.render('<Foo class="top" />');
      this.assertHTML('<div class="top foo bar qux"></div>');
    }
  }
);

moduleFor(
  'AngleBracket Invocation Nested Lookup',
  class extends RenderingTestCase {
    '@test it can resolve <Foo::Bar::BazBing /> to foo/bar/baz-bing'() {
      this.registerComponent('foo/bar/baz-bing', { template: 'hello' });

      this.render('<Foo::Bar::BazBing />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }
  }
);

moduleFor(
  'Element modifiers on AngleBracket components',
  class extends RenderingTestCase {
    '@test modifiers are forwarded to a single element receiving the splattributes'(assert) {
      let modifierParams = null;
      let modifierNamedArgs = null;
      let modifiedElement;
      this.registerComponent('the-foo', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div id="inner-div" ...attributes>Foo</div>',
      });
      this.registerModifier(
        'bar',
        BaseModifier.extend({
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
        })
      );
      this.render('<TheFoo {{bar "something" foo="else"}}/>', {});
      assert.deepEqual(modifierParams, ['something']);
      assert.deepEqual(modifierNamedArgs, { foo: 'else' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
    }

    '@test modifiers are forwarded to all the elements receiving the splattributes'(assert) {
      let elementIds = [];
      this.registerComponent('the-foo', {
        ComponentClass: Component.extend({ tagName: '' }),
        template:
          '<div id="inner-one" ...attributes>Foo</div><div id="inner-two" ...attributes>Bar</div>',
      });
      this.registerModifier(
        'bar',
        BaseModifier.extend({
          didInsertElement(params, namedArgs) {
            assert.deepEqual(params, ['something']);
            assert.deepEqual(namedArgs, { foo: 'else' });
            if (this.element) {
              elementIds.push(this.element.getAttribute('id'));
            }
          },
        })
      );
      this.render('<TheFoo {{bar "something" foo="else"}}/>');
      assert.deepEqual(
        elementIds,
        ['inner-one', 'inner-two'],
        'The modifier has been instantiated twice, once for each element with splattributes'
      );
    }

    '@test modifiers on components accept bound arguments and track changes on the'(assert) {
      let modifierParams = null;
      let modifierNamedArgs = null;
      let modifiedElement;
      this.registerComponent('the-foo', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div id="inner-div" ...attributes>Foo</div>',
      });
      this.registerModifier(
        'bar',
        BaseModifier.extend({
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
          didUpdate(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
        })
      );
      this.render('<TheFoo {{bar this.something foo=this.foo}}/>', {
        something: 'something',
        foo: 'else',
      });
      assert.deepEqual(modifierParams, ['something']);
      assert.deepEqual(modifierNamedArgs, { foo: 'else' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
      runTask(() => setProperties(this.context, { something: 'another', foo: 'thingy' }));
      assert.deepEqual(modifierParams, ['another']);
      assert.deepEqual(modifierNamedArgs, { foo: 'thingy' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
    }

    '@test modifiers on components accept `this` in both positional params and named arguments, and updates when it changes'(
      assert
    ) {
      let modifierParams = null;
      let modifierNamedArgs = null;
      let modifiedElement;
      let context = { id: 1 };
      let context2 = { id: 2 };
      this.registerComponent('the-foo', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div id="inner-div" ...attributes>Foo</div>',
      });
      this.registerModifier(
        'bar',
        BaseModifier.extend({
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
          didUpdate(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
        })
      );
      this.render('<TheFoo {{bar "name" this foo=this}}/>', context);
      assert.equal(modifierParams[1].id, 1);
      assert.equal(modifierNamedArgs.foo.id, 1);
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
      runTask(() => setProperties(this.context, context2));
      assert.equal(modifierParams[1].id, 2);
      assert.equal(modifierNamedArgs.foo.id, 2);
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
    }

    '@test modifiers on components accept local variables in both positional params and named arguments, and updates when they change'(
      assert
    ) {
      let modifierParams = null;
      let modifierNamedArgs = null;
      let modifiedElement;
      this.registerComponent('the-foo', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div id="inner-div" ...attributes>Foo</div>',
      });
      this.registerModifier(
        'bar',
        BaseModifier.extend({
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
          didUpdate(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          },
        })
      );
      this.render(
        `
        {{#let this.foo as |v|}}
          <TheFoo {{bar v foo=v}}/>
        {{/let}}`,
        { foo: 'bar' }
      );
      assert.deepEqual(modifierParams, ['bar']);
      assert.deepEqual(modifierNamedArgs, { foo: 'bar' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
      runTask(() => setProperties(this.context, { foo: 'qux' }));
      assert.deepEqual(modifierParams, ['qux']);
      assert.deepEqual(modifierNamedArgs, { foo: 'qux' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
    }

    '@test modifiers on components can be received and forwarded to inner component'(assert) {
      let modifierParams = null;
      let modifierNamedArgs = null;
      let elementIds = [];

      this.registerComponent('the-inner', {
        ComponentClass: Component.extend({ tagName: '' }),
        template: '<div id="inner-div" ...attributes>{{yield}}</div>',
      });
      this.registerComponent('the-foo', {
        ComponentClass: Component.extend({ tagName: '' }),
        template:
          '<div id="outer-div" ...attributes>Outer</div><TheInner ...attributes>Hello</TheInner>',
      });
      this.registerModifier(
        'bar',
        BaseModifier.extend({
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            if (this.element) {
              elementIds.push(this.element.getAttribute('id'));
            }
          },
        })
      );
      this.render(
        `
        {{#let this.foo as |v|}}
          <TheFoo {{bar v foo=v}}/>
        {{/let}}
      `,
        { foo: 'bar' }
      );
      assert.deepEqual(modifierParams, ['bar']);
      assert.deepEqual(modifierNamedArgs, { foo: 'bar' });
      assert.deepEqual(
        elementIds,
        ['outer-div', 'inner-div'],
        'Modifiers are called on all levels'
      );
    }
  }
);
