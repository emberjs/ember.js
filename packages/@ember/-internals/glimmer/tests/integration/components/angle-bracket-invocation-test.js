import { moduleFor, RenderingTestCase, strip, classes, runTask } from 'internal-test-helpers';
import { setModifierManager, modifierCapabilities, setComponentTemplate } from '@glimmer/manager';
import EmberObject from '@ember/object';

import { set, setProperties } from '@ember/object';

import { Component } from '../../utils/helpers';
import { template } from '@ember/template-compiler/runtime';
import templateOnly from '@ember/component/template-only';
import { precompileTemplate } from '@ember/template-compilation';

class CustomModifierManager {
  constructor(owner) {
    this.capabilities = modifierCapabilities('3.22');
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
  (owner) => {
    return new CustomModifierManager(owner);
  },
  class extends EmberObject {
    didInsertElement() {}
    didUpdate() {}
    willDestroyElement() {}
  }
);

moduleFor(
  'AngleBracket Invocation',
  class extends RenderingTestCase {
    '@test it can resolve <XBlah /> to x-blah'() {
      this.owner.register(
        'component:x-blah',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<XBlah />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can resolve <X-Blah /> to x-blah'() {
      this.owner.register(
        'component:x-blah',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<X-Blah />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic template only component'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can render a basic component with template and javascript'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('FIZZ BAR {{this.local}}'),
          class extends Component {
            local = 'hey';
          }
        )
      );

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: 'FIZZ BAR hey' });
    }

    '@test it can render a single word component name'() {
      this.owner.register(
        'component:foo',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<Foo />');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    '@test it can not render a component name without initial capital letter'(assert) {
      this.owner.register(
        'component:div',
        class extends Component {
          init() {
            assert.ok(false, 'should not have created component');
          }
        }
      );

      this.render('<div></div>');

      this.assertElement(this.firstChild, { tagName: 'div', content: '' });
    }

    '@test it can have a custom id and it is not bound'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.id}} {{this.elementId}}'),
          class extends Component {}
        )
      );

      this.render('<FooBar @id={{this.customId}} />', {
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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<FooBar id={{this.customId}} />', {
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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('hello'),
          class extends Component {
            tagName = 'foo-bar';
          }
        )
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('hello'),
          class extends Component {
            classNames = ['foo', 'bar'];
          }
        )
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<FooBar @class={{if this.fooBar "foo-bar"}} />', {
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
      let FooBarComponent = class extends Component {
        classNames = ['foo'];
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

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

      let FooBarComponent = class extends Component {
        init() {
          super.init();
          instance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), FooBarComponent)
      );

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

      let FooBarComponent = class extends Component {
        init() {
          super.init();
          fooBarInstance = this;
        }
      };

      let FooBarBazComponent = class extends Component {
        init() {
          super.init();
          fooBarBazInstance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('foo-bar {{foo-bar-baz}}'), FooBarComponent)
      );
      this.owner.register(
        'component:foo-bar-baz',
        setComponentTemplate(precompileTemplate('foo-bar-baz'), FooBarBazComponent)
      );

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{@foo}}'), class extends Component {})
      );

      this.render('<FooBar @foo={{this.model.bar}} />', {
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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.foo}}'), class extends Component {})
      );

      this.render('<FooBar @foo={{this.model.bar}} />', {
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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{yield}} - In component'),
          class extends Component {}
        )
      );

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

      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          instance = this;
        }
        greeting = 'hello';
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{yield this.greeting this.greetee.firstName}}'),
          FooBarComponent
        )
      );

      this.render(
        '<FooBar @greetee={{this.person}} as |greeting name|>{{name}} {{this.person.lastName}}, {{greeting}}</FooBar>',
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
      let TestComponent = class extends Component {
        static positionalParams = ['first', 'second'];
      };

      this.owner.register(
        'component:sample-component',
        setComponentTemplate(precompileTemplate('{{this.first}}{{this.second}}'), TestComponent)
      );

      // this is somewhat silly as the browser "corrects" for these as
      // attribute names, but regardless the thing we care about here is that
      // they are **not** used as positional params
      this.render('<SampleComponent one two />');

      this.assertText('');
    }

    '@test can invoke curried components with capitalized block param names'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render(strip`
        {{#let (component 'foo-bar') as |Other|}}
          <Other />
        {{/let}}
      `);

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    '@test can invoke curried components with named args'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );
      this.owner.register(
        'component:test-harness',
        setComponentTemplate(precompileTemplate('<@foo />'), class extends Component {})
      );
      this.render(strip`{{test-harness foo=(component 'foo-bar')}}`);

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    '@test can invoke curried components with a path'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );
      this.owner.register(
        'component:test-harness',
        setComponentTemplate(precompileTemplate('<this.foo />'), class extends Component {})
      );
      this.render(strip`{{test-harness foo=(component 'foo-bar')}}`);

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild.firstChild, { content: 'hello' });

      this.assertStableRerender();
    }

    '@test can not invoke curried components with an implicit `this` path'(assert) {
      assert.throws(() => {
        // attempting to compile this template will throw
        this.owner.register(
          'component:test-harness',
          template('<foo.bar />', { component: class extends Component {}, strictMode: false })
        );
      }, /Error: You used foo.bar as a tag name, but foo is not in scope/);
    }

    '@test has-block'() {
      this.owner.register(
        'component:check-block',
        template(
          strip`
            {{#if (has-block)}}
              Yes
            {{else}}
              No
            {{/if}}
          `,
          { component: class extends Component {}, strictMode: false }
        )
      );

      this.render(strip`
        <CheckBlock />
        <CheckBlock></CheckBlock>`);

      this.assertComponentElement(this.firstChild, { content: 'No' });
      this.assertComponentElement(this.nthChild(1), { content: 'Yes' });

      this.assertStableRerender();
    }

    '@test includes invocation specified attributes in root element ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

      this.render('<FooBar data-foo={{this.foo}} data-bar={{this.bar}} />', {
        foo: 'foo',
        bar: 'bar',
      });

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar data-bar />');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-bar': '' },
        content: 'hello',
      });

      this.assertStableRerender();
    }

    '@test attributes without values at definition are included in `...attributes` ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div data-bar ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar />');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-bar': '' },
        content: 'hello',
      });

      this.assertStableRerender();
    }

    '@test includes invocation specified attributes in `...attributes` slot in tagless component ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar data-foo={{this.foo}} data-bar={{this.bar}} />', {
        foo: 'foo',
        bar: 'bar',
      });

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div data-derp={{this.localProp}} ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
            init() {
              instance = this;
              super.init(...arguments);
              this.localProp = 'qux';
            }
          }
        )
      );

      this.render('<FooBar data-foo={{this.foo}} data-bar={{this.bar}} />', {
        foo: 'foo',
        bar: 'bar',
      });

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div class={{this.localProp}} ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
            init() {
              instance = this;
              super.init(...arguments);
              this.localProp = 'qux';
            }
          }
        )
      );

      this.render('<FooBar class={{this.bar}} />', { bar: 'bar' });

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div ...attributes class={{this.localProp}}>hello</div>'),
          class extends Component {
            tagName = '';
            init() {
              instance = this;
              super.init(...arguments);
              this.localProp = 'qux';
            }
          }
        )
      );

      this.render('<FooBar class={{this.bar}} />', { bar: 'bar' });

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
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{yield (hash baz=(component "foo-bar/baz"))}}'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.owner.register(
        'component:foo-bar/baz',
        setComponentTemplate(
          precompileTemplate('<div class="default-class" ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar as |fb|><fb.baz class="custom-class" title="foo"></fb.baz></FooBar>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('default-class custom-class'), title: 'foo' },
        content: 'hello',
      });
    }

    '@test merges trailing class attribute with `...attributes` in yielded contextual component ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{yield (hash baz=(component "foo-bar/baz"))}}'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.owner.register(
        'component:foo-bar/baz',
        setComponentTemplate(
          precompileTemplate('<div ...attributes class="default-class" >hello</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar as |fb|><fb.baz class="custom-class" title="foo"></fb.baz></FooBar>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('custom-class default-class'), title: 'foo' },
        content: 'hello',
      });
    }

    '@test the attributes passed on invocation trump over the default ones on elements with `...attributes` in yielded contextual component ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{yield (hash baz=(component "foo-bar/baz"))}}'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.owner.register(
        'component:foo-bar/baz',
        setComponentTemplate(
          precompileTemplate('<div title="bar" ...attributes>hello</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar as |fb|><fb.baz title="foo"></fb.baz></FooBar>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { title: 'foo' },
        content: 'hello',
      });
    }

    '@test can forward ...attributes to dynamic component invocation ("splattributes")'() {
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate('<XInner ...attributes>{{yield}}</XInner>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div ...attributes>{{yield}}</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

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
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate(
            `{{#let (component 'x-inner') as |Thing|}}<Thing ...attributes>{{yield}}</Thing>{{/let}}`
          ),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div ...attributes>{{yield}}</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<XOuter data-foo>Hello!</XOuter>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': '' },
        content: 'Hello!',
      });
    }

    '@test an inner angle invocation can forward ...attributes through static component invocation ("splattributes")'() {
      this.owner.register(
        'component:x-outer',
        setComponentTemplate(
          precompileTemplate(`<XInner ...attributes>{{yield}}</XInner>`),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.owner.register(
        'component:x-inner',
        setComponentTemplate(
          precompileTemplate('<div ...attributes>{{yield}}</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<XOuter data-foo>Hello!</XOuter>');

      this.assertElement(this.firstChild, {
        tagName: 'div',
        attrs: { 'data-foo': '' },
        content: 'Hello!',
      });
    }

    '@test can include `...attributes` in multiple elements in tagless component ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('<div ...attributes>hello</div><p ...attributes>world</p>'),
          class extends Component {
            tagName = '';
          }
        )
      );

      this.render('<FooBar data-foo={{this.foo}} data-bar={{this.bar}} />', {
        foo: 'foo',
        bar: 'bar',
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
      this.owner.register(
        'component:foo-bar/inner',
        setComponentTemplate(
          precompileTemplate('<h1 ...attributes>{{yield}}</h1>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.owner.register(
        'component:foo-bar',
        template(
          strip`
            {{#let (component "foo-bar/inner") as |Inner|}}
              <Inner ...attributes>{{yield}}</Inner>
              <h2>Inside the let</h2>
            {{/let}}
            <h3>Outside the let</h3>
          `,
          {
            component: class extends Component {
              tagName = '';
            },
            strictMode: false,
          }
        )
      );

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
    '@test angle bracket invocation can pass merge ...attributes'() {
      this.owner.register(
        'component:qux',
        setComponentTemplate(
          precompileTemplate('<div data-from-qux-before ...attributes data-from-qux-after></div>'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('<Qux data-from-bar-before ...attributes data-from-bar-after />'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:foo',
        setComponentTemplate(
          precompileTemplate('<Bar data-from-foo-before ...attributes data-from-foo-after />'),
          templateOnly()
        )
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
      this.owner.register(
        'component:qux',
        setComponentTemplate(precompileTemplate('<div id="qux" ...attributes />'), templateOnly())
      );
      this.owner.register(
        'component:bar',
        setComponentTemplate(precompileTemplate('<Qux id="bar" ...attributes />'), templateOnly())
      );
      this.owner.register(
        'component:foo',
        setComponentTemplate(precompileTemplate('<Bar id="foo" ...attributes />'), templateOnly())
      );

      this.render('<Foo id="top" />');
      this.assertHTML('<div id="top"></div>');
    }

    '@test angle bracket invocation can override invocation side attributes with ...attributes'() {
      this.owner.register(
        'component:qux',
        setComponentTemplate(precompileTemplate('<div ...attributes id="qux" />'), templateOnly())
      );
      this.owner.register(
        'component:bar',
        setComponentTemplate(precompileTemplate('<Qux ...attributes id="bar" />'), templateOnly())
      );
      this.owner.register(
        'component:foo',
        setComponentTemplate(precompileTemplate('<Bar ...attributes id="foo" />'), templateOnly())
      );

      this.render('<Foo id="top" />');
      this.assertHTML('<div id="qux"></div>');
    }

    '@test angle bracket invocation can forward classes before ...attributes to a nested component'() {
      this.owner.register(
        'component:qux',
        setComponentTemplate(
          precompileTemplate('<div class="qux" ...attributes />'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('<Qux class="bar" ...attributes />'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:foo',
        setComponentTemplate(
          precompileTemplate('<Bar class="foo" ...attributes />'),
          templateOnly()
        )
      );

      this.render('<Foo class="top" />');
      this.assertHTML('<div class="qux bar foo top"></div>');
    }

    '@test angle bracket invocation can forward classes after ...attributes to a nested component'() {
      this.owner.register(
        'component:qux',
        setComponentTemplate(
          precompileTemplate('<div ...attributes class="qux" />'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:bar',
        setComponentTemplate(
          precompileTemplate('<Qux ...attributes class="bar" />'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:foo',
        setComponentTemplate(
          precompileTemplate('<Bar ...attributes class="foo" />'),
          templateOnly()
        )
      );

      this.render('<Foo class="top" />');
      this.assertHTML('<div class="top foo bar qux"></div>');
    }
  }
);

moduleFor(
  'AngleBracket Invocation Nested Lookup',
  class extends RenderingTestCase {
    '@test it can resolve <Foo::Bar::BazBing /> to foo/bar/baz-bing'() {
      this.owner.register(
        'component:foo/bar/baz-bing',
        setComponentTemplate(precompileTemplate('hello'), class extends Component {})
      );

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
    assertNamedArgs(actual, expected, message) {
      // `actual` is likely to be a named args proxy, while the `deepEqual` below would see
      // the values as the same it would still flag as not deep equals because the constructors
      // of the two objects do not match (one is a proxy, one is Object)
      let reifiedActual = Object.assign({}, actual);

      this.assert.deepEqual(reifiedActual, expected, message);
    }

    '@test modifiers are forwarded to a single element receiving the splattributes'(assert) {
      let modifierParams = null;
      let modifierNamedArgs = null;
      let modifiedElement;
      this.owner.register(
        'component:the-foo',
        setComponentTemplate(
          precompileTemplate('<div id="inner-div" ...attributes>Foo</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.registerModifier(
        'bar',
        class extends BaseModifier {
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
        }
      );
      this.render('<TheFoo {{bar "something" foo="else"}}/>', {});
      assert.deepEqual(modifierParams, ['something'], 'positional arguments');
      this.assertNamedArgs(modifierNamedArgs, { foo: 'else' }, 'named arguments');
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
    }

    '@test modifiers are forwarded to all the elements receiving the splattributes'(assert) {
      let elementIds = [];
      this.owner.register(
        'component:the-foo',
        setComponentTemplate(
          precompileTemplate(
            '<div id="inner-one" ...attributes>Foo</div><div id="inner-two" ...attributes>Bar</div>'
          ),
          class extends Component {
            tagName = '';
          }
        )
      );
      let test = this;
      this.registerModifier(
        'bar',
        class extends BaseModifier {
          didInsertElement(params, namedArgs) {
            assert.deepEqual(params, ['something']);
            test.assertNamedArgs(namedArgs, { foo: 'else' });
            if (this.element) {
              elementIds.push(this.element.getAttribute('id'));
            }
          }
        }
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
      this.owner.register(
        'component:the-foo',
        setComponentTemplate(
          precompileTemplate('<div id="inner-div" ...attributes>Foo</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.registerModifier(
        'bar',
        class extends BaseModifier {
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
          didUpdate(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
        }
      );
      this.render('<TheFoo {{bar this.something foo=this.foo}}/>', {
        something: 'something',
        foo: 'else',
      });
      assert.deepEqual(modifierParams, ['something']);
      this.assertNamedArgs(modifierNamedArgs, { foo: 'else' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
      runTask(() => setProperties(this.context, { something: 'another', foo: 'thingy' }));
      assert.deepEqual(modifierParams, ['another']);
      this.assertNamedArgs(modifierNamedArgs, { foo: 'thingy' });
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
      this.owner.register(
        'component:the-foo',
        setComponentTemplate(
          precompileTemplate('<div id="inner-div" ...attributes>Foo</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.registerModifier(
        'bar',
        class extends BaseModifier {
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
          didUpdate(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
        }
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
      this.owner.register(
        'component:the-foo',
        setComponentTemplate(
          precompileTemplate('<div id="inner-div" ...attributes>Foo</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.registerModifier(
        'bar',
        class extends BaseModifier {
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
          didUpdate(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            modifiedElement = this.element;
          }
        }
      );
      this.render(
        `
        {{#let this.foo as |v|}}
          <TheFoo {{bar v foo=v}}/>
        {{/let}}`,
        { foo: 'bar' }
      );
      assert.deepEqual(modifierParams, ['bar']);
      this.assertNamedArgs(modifierNamedArgs, { foo: 'bar' });
      assert.equal(
        modifiedElement && modifiedElement.getAttribute('id'),
        'inner-div',
        'Modifier is called on the element receiving the splattributes'
      );
      runTask(() => setProperties(this.context, { foo: 'qux' }));
      assert.deepEqual(modifierParams, ['qux']);
      this.assertNamedArgs(modifierNamedArgs, { foo: 'qux' });
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

      this.owner.register(
        'component:the-inner',
        setComponentTemplate(
          precompileTemplate('<div id="inner-div" ...attributes>{{yield}}</div>'),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.owner.register(
        'component:the-foo',
        setComponentTemplate(
          precompileTemplate(
            '<div id="outer-div" ...attributes>Outer</div><TheInner ...attributes>Hello</TheInner>'
          ),
          class extends Component {
            tagName = '';
          }
        )
      );
      this.registerModifier(
        'bar',
        class extends BaseModifier {
          didInsertElement(params, namedArgs) {
            modifierParams = params;
            modifierNamedArgs = namedArgs;
            if (this.element) {
              elementIds.push(this.element.getAttribute('id'));
            }
          }
        }
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
      this.assertNamedArgs(modifierNamedArgs, { foo: 'bar' });
      assert.deepEqual(
        elementIds,
        ['outer-div', 'inner-div'],
        'Modifiers are called on all levels'
      );
    }
  }
);
