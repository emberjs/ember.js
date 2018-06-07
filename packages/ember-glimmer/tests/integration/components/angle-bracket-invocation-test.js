import { EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION } from '@ember/canary-features';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { set } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { classes } from '../../utils/test-helpers';

if (EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION) {
  moduleFor(
    'AngleBracket Invocation',
    class extends RenderingTest {
      '@test it can resolve <XBlah /> to x-blah'() {
        this.registerComponent('x-blah', { template: 'hello' });

        this.render('<XBlah />');

        this.assertComponentElement(this.firstChild, { content: 'hello' });

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, { content: 'hello' });
      }

      '@test it can resolve <X-Blah /> to x-blah'() {
        this.registerComponent('x-blah', { template: 'hello' });

        this.render('<X-Blah />');

        this.assertComponentElement(this.firstChild, { content: 'hello' });

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, { content: 'hello' });
      }

      '@test it can render a basic template only component'() {
        this.registerComponent('foo-bar', { template: 'hello' });

        this.render('<FooBar />');

        this.assertComponentElement(this.firstChild, { content: 'hello' });

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { id: 'bizz' },
          content: 'bizz bizz',
        });

        this.runTask(() => set(this.context, 'customId', 'bar'));

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { id: 'bizz' },
          content: 'bar bizz',
        });

        this.runTask(() => set(this.context, 'customId', 'bizz'));

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { id: 'bizz' },
          content: 'bizz bizz',
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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, {
          content: 'hello',
          attrs: { class: classes('ember-view foo-bar') },
        });

        this.runTask(() => set(this.context, 'fooBar', false));

        this.assertComponentElement(this.firstChild, {
          content: 'hello',
          attrs: { class: classes('ember-view') },
        });

        this.runTask(() => set(this.context, 'fooBar', true));

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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());
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

        this.runTask(() => this.rerender());

        this.assertText('Hola');

        this.runTask(() => this.context.set('model.bar', 'Hello'));

        this.assertText('Hello');

        this.runTask(() => this.context.set('model', { bar: 'Hola' }));

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

        this.runTask(() => this.rerender());

        this.assertText('Hola');

        this.runTask(() => this.context.set('model.bar', 'Hello'));

        this.assertText('Hello');

        this.runTask(() => this.context.set('model', { bar: 'Hola' }));

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

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, {
          content: 'Joel Kang, hello',
        });

        this.runTask(() =>
          set(this.context, 'person', {
            firstName: 'Dora',
            lastName: 'the Explorer',
          })
        );

        this.assertComponentElement(this.firstChild, {
          content: 'Dora the Explorer, hello',
        });

        this.runTask(() => set(instance, 'greeting', 'hola'));

        this.assertComponentElement(this.firstChild, {
          content: 'Dora the Explorer, hola',
        });

        this.runTask(() => {
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

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, { content: 'hello' });

        this.assertStableRerender();
      }

      '@test can invoke curried components with named args'() {
        this.registerComponent('foo-bar', { template: 'hello' });
        this.registerComponent('test-harness', { template: '<@foo />' });
        this.render(strip`{{test-harness foo=(component 'foo-bar')}}`);

        this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

        this.assertStableRerender();
      }

      '@test can invoke curried components with a path'() {
        this.registerComponent('foo-bar', { template: 'hello' });
        this.registerComponent('test-harness', { template: '<this.foo />' });
        this.render(strip`{{test-harness foo=(component 'foo-bar')}}`);

        this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

        this.runTask(() => this.rerender());

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

        this.runTask(() => this.rerender());

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
          content: 'hello',
        });

        this.runTask(() => {
          set(this.context, 'foo', 'FOO');
          set(this.context, 'bar', undefined);
        });

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-foo': 'FOO' },
          content: 'hello',
        });

        this.runTask(() => {
          set(this.context, 'foo', 'foo');
          set(this.context, 'bar', 'bar');
        });

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
          content: 'hello',
        });
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

        this.runTask(() => this.rerender());

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-foo': 'foo', 'data-bar': 'bar' },
          content: 'hello',
        });

        this.runTask(() => {
          set(this.context, 'foo', 'FOO');
          set(this.context, 'bar', undefined);
        });

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-foo': 'FOO' },
          content: 'hello',
        });

        this.runTask(() => {
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

        this.runTask(() => this.rerender());

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-derp': 'qux', 'data-foo': 'foo', 'data-bar': 'bar' },
          content: 'hello',
        });

        this.runTask(() => {
          set(this.context, 'foo', 'FOO');
          set(this.context, 'bar', undefined);
          set(instance, 'localProp', 'QUZ');
        });

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { 'data-derp': 'QUZ', 'data-foo': 'FOO' },
          content: 'hello',
        });

        this.runTask(() => {
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

        this.runTask(() => this.rerender());

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { class: classes('qux bar') },
          content: 'hello',
        });

        this.runTask(() => {
          set(this.context, 'bar', undefined);
          set(instance, 'localProp', 'QUZ');
        });

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { class: classes('QUZ') },
          content: 'hello',
        });

        this.runTask(() => {
          set(this.context, 'bar', 'bar');
          set(instance, 'localProp', 'qux');
        });

        this.assertElement(this.firstChild, {
          tagName: 'div',
          attrs: { class: classes('qux bar') },
          content: 'hello',
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

        this.runTask(() => this.rerender());

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

        this.runTask(() => {
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

        this.runTask(() => {
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
    }
  );
}
