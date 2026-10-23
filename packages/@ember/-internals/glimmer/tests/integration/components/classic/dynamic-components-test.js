import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { set } from '@ember/object';
import { Component as EmberComponent } from '../../../utils/helpers';

moduleFor(
  'Components test: dynamic components (classic component)',
  class extends RenderingTestCase {
    ['@test it has an element']() {
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

      this.render('{{component "foo-bar"}}');

      let element1 = instance.element;

      this.assertComponentElement(element1, { content: 'hello' });

      runTask(() => this.rerender());

      let element2 = instance.element;

      this.assertComponentElement(element2, { content: 'hello' });

      this.assertSameNode(element2, element1);
    }

    ['@test it has the right parentView and childViews'](assert) {
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

      this.render('{{component "foo-bar"}}');
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

    ['@test positional parameters does not clash when rendering different components']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('hello {{this.name}} ({{this.age}}) from foo-bar'),
          class extends EmberComponent {
            static positionalParams = ['name', 'age'];
          }
        )
      );

      this.owner.register(
        'component:foo-bar-baz',
        setComponentTemplate(
          precompileTemplate('hello {{this.name}} ({{this.age}}) from foo-bar-baz'),
          class extends EmberComponent {
            static positionalParams = ['name', 'age'];
          }
        )
      );

      this.render('{{component this.componentName this.name this.age}}', {
        componentName: 'foo-bar',
        name: 'Alex',
        age: 29,
      });

      this.assertText('hello Alex (29) from foo-bar');

      runTask(() => this.rerender());

      this.assertText('hello Alex (29) from foo-bar');

      runTask(() => set(this.context, 'name', 'Ben'));

      this.assertText('hello Ben (29) from foo-bar');

      runTask(() => set(this.context, 'age', 22));

      this.assertText('hello Ben (22) from foo-bar');

      runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

      this.assertText('hello Ben (22) from foo-bar-baz');

      runTask(() => {
        set(this.context, 'componentName', 'foo-bar');
        set(this.context, 'name', 'Alex');
        set(this.context, 'age', 29);
      });

      this.assertText('hello Alex (29) from foo-bar');
    }

    ['@test positional parameters does not pollute the attributes when changing components']() {
      this.owner.register(
        'component:normal-message',
        setComponentTemplate(
          precompileTemplate('Normal: {{this.something}}!'),
          class extends EmberComponent {
            static positionalParams = ['something'];
          }
        )
      );

      this.owner.register(
        'component:alternative-message',
        setComponentTemplate(
          precompileTemplate('Alternative: {{this.something}} {{this.somethingElse}}!'),
          class extends EmberComponent {
            static positionalParams = ['somethingElse'];
            something = 'Another';
          }
        )
      );

      this.render('{{component this.componentName this.message}}', {
        componentName: 'normal-message',
        message: 'Hello',
      });

      this.assertText('Normal: Hello!');

      runTask(() => this.rerender());

      this.assertText('Normal: Hello!');

      runTask(() => set(this.context, 'componentName', 'alternative-message'));

      this.assertText('Alternative: Another Hello!');

      runTask(() => set(this.context, 'message', 'Hi'));

      this.assertText('Alternative: Another Hi!');

      runTask(() => {
        set(this.context, 'componentName', 'normal-message');
        set(this.context, 'message', 'Hello');
      });

      this.assertText('Normal: Hello!');
    }

    ['@test static arbitrary number of positional parameters']() {
      this.owner.register(
        'component:sample-component',
        setComponentTemplate(
          precompileTemplate('{{#each this.names as |name|}}{{name}}{{/each}}'),
          class extends EmberComponent {
            static positionalParams = 'names';
          }
        )
      );

      this.render(`{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" elementId="helper"}}`);

      this.assertText('Foo4Bar5Baz');

      runTask(() => this.rerender());

      this.assertText('Foo4Bar5Baz');
    }

    ['@test dynamic arbitrary number of positional parameters']() {
      this.owner.register(
        'component:sample-component',
        setComponentTemplate(
          precompileTemplate('{{#each this.n as |name|}}{{name}}{{/each}}'),
          class extends EmberComponent {
            static positionalParams = 'n';
          }
        )
      );

      this.render(`{{component "sample-component" this.user1 this.user2}}`, {
        user1: 'Foo',
        user2: 4,
      });

      this.assertText('Foo4');

      runTask(() => this.rerender());

      this.assertText('Foo4');

      runTask(() => this.context.set('user1', 'Bar'));

      this.assertText('Bar4');

      runTask(() => this.context.set('user2', '5'));

      this.assertText('Bar5');

      runTask(() => {
        this.context.set('user1', 'Foo');
        this.context.set('user2', 4);
      });

      this.assertText('Foo4');
    }
  }
);
