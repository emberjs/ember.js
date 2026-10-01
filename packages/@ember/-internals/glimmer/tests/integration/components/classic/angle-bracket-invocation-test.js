import { moduleFor, RenderingTestCase, strip, classes, runTask } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { set } from '@ember/object';
import { Component as EmberComponent } from '../../../utils/helpers';
import { precompileTemplate } from '@ember/template-compilation';

moduleFor(
  'AngleBracket Invocation (classic component)',
  class extends RenderingTestCase {
    '@test it can have a custom id and it is not bound'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{this.id}} {{this.elementId}}'),
          class extends EmberComponent {}
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
        setComponentTemplate(precompileTemplate('hello'), class extends EmberComponent {})
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
          class extends EmberComponent {
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
        setComponentTemplate(precompileTemplate('hello'), class extends EmberComponent {})
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
          class extends EmberComponent {
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
        setComponentTemplate(precompileTemplate('hello'), class extends EmberComponent {})
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
      let FooBarComponent = class extends EmberComponent {
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

      let FooBarComponent = class extends EmberComponent {
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

      let FooBarComponent = class extends EmberComponent {
        init() {
          super.init();
          fooBarInstance = this;
        }
      };

      let FooBarBazComponent = class extends EmberComponent {
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

    '@test it reflects named arguments as properties'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('{{this.foo}}'), class extends EmberComponent {})
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

    '@test positional parameters are not allowed'() {
      let TestComponent = class extends EmberComponent {
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

    '@test includes invocation specified attributes in root element ("splattributes")'() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('hello'), class extends EmberComponent {})
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
  }
);
