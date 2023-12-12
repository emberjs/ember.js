import { DEBUG } from '@glimmer/env';
import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { set, computed } from '@ember/object';

import { Component } from '../../utils/helpers';
import { backtrackingMessageFor } from '../../utils/debug-stack';

moduleFor(
  'Components test: dynamic components',
  class extends RenderingTestCase {
    ['@test it can render a basic component with a static component name argument']() {
      this.registerComponent('foo-bar', { template: 'hello {{this.name}}' });

      this.render('{{component "foo-bar" name=this.name}}', { name: 'Sarah' });

      this.assertComponentElement(this.firstChild, { content: 'hello Sarah' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello Sarah' });

      runTask(() => set(this.context, 'name', 'Gavin'));

      this.assertComponentElement(this.firstChild, { content: 'hello Gavin' });

      runTask(() => set(this.context, 'name', 'Sarah'));

      this.assertComponentElement(this.firstChild, { content: 'hello Sarah' });
    }

    ['@test it can render a basic component with a dynamic component name argument']() {
      this.registerComponent('foo-bar', {
        template: 'hello {{this.name}} from foo-bar',
      });
      this.registerComponent('foo-bar-baz', {
        template: 'hello {{this.name}} from foo-bar-baz',
      });

      this.render('{{component this.componentName name=this.name}}', {
        componentName: 'foo-bar',
        name: 'Alex',
      });

      this.assertComponentElement(this.firstChild, {
        content: 'hello Alex from foo-bar',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'hello Alex from foo-bar',
      });

      runTask(() => set(this.context, 'name', 'Ben'));

      this.assertComponentElement(this.firstChild, {
        content: 'hello Ben from foo-bar',
      });

      runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

      this.assertComponentElement(this.firstChild, {
        content: 'hello Ben from foo-bar-baz',
      });

      runTask(() => {
        set(this.context, 'componentName', 'foo-bar');
        set(this.context, 'name', 'Alex');
      });

      this.assertComponentElement(this.firstChild, {
        content: 'hello Alex from foo-bar',
      });
    }

    ['@test it has an element']() {
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

    ['@test it can render a basic component with a block']() {
      this.registerComponent('foo-bar', { template: '{{yield}}' });

      this.render('{{#component "foo-bar"}}hello{{/component}}');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    ['@test it renders the layout with the component instance as the context']() {
      let instance;

      let FooBarComponent = Component.extend({
        init() {
          this._super();
          instance = this;
          this.set('message', 'hello');
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{this.message}}',
      });

      this.render('{{component "foo-bar"}}');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => set(instance, 'message', 'goodbye'));

      this.assertComponentElement(this.firstChild, { content: 'goodbye' });

      runTask(() => set(instance, 'message', 'hello'));

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    ['@test it preserves the outer context when yielding']() {
      this.registerComponent('foo-bar', { template: '{{yield}}' });

      this.render('{{#component "foo-bar"}}{{this.message}}{{/component}}', {
        message: 'hello',
      });

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => set(this.context, 'message', 'goodbye'));

      this.assertComponentElement(this.firstChild, { content: 'goodbye' });

      runTask(() => set(this.context, 'message', 'hello'));

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    ['@test the component and its child components are destroyed'](assert) {
      let destroyed = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

      this.registerComponent('foo-bar', {
        template: '{{this.id}} {{yield}}',
        ComponentClass: Component.extend({
          willDestroy() {
            this._super();
            destroyed[this.get('id')]++;
          },
        }),
      });

      this.render(
        strip`
      {{#if this.cond1}}
        {{#component "foo-bar" id=1}}
          {{#if this.cond2}}
            {{#component "foo-bar" id=2}}{{/component}}
            {{#if this.cond3}}
              {{#component "foo-bar" id=3}}
                {{#if this.cond4}}
                  {{#component "foo-bar" id=4}}
                    {{#if this.cond5}}
                      {{#component "foo-bar" id=5}}{{/component}}
                      {{#component "foo-bar" id=6}}{{/component}}
                      {{#component "foo-bar" id=7}}{{/component}}
                    {{/if}}
                    {{#component "foo-bar" id=8}}{{/component}}
                  {{/component}}
                {{/if}}
              {{/component}}
            {{/if}}
          {{/if}}
        {{/component}}
      {{/if}}`,
        {
          cond1: true,
          cond2: true,
          cond3: true,
          cond4: true,
          cond5: true,
        }
      );

      this.assertText('1 2 3 4 5 6 7 8 ');

      runTask(() => this.rerender());

      assert.deepEqual(destroyed, {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
      });

      runTask(() => set(this.context, 'cond5', false));

      this.assertText('1 2 3 4 8 ');

      assert.deepEqual(destroyed, {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 1,
        6: 1,
        7: 1,
        8: 0,
      });

      runTask(() => {
        set(this.context, 'cond3', false);
        set(this.context, 'cond5', true);
        set(this.context, 'cond4', false);
      });

      assert.deepEqual(destroyed, {
        1: 0,
        2: 0,
        3: 1,
        4: 1,
        5: 1,
        6: 1,
        7: 1,
        8: 1,
      });

      runTask(() => {
        set(this.context, 'cond2', false);
        set(this.context, 'cond1', false);
      });

      assert.deepEqual(destroyed, {
        1: 1,
        2: 1,
        3: 1,
        4: 1,
        5: 1,
        6: 1,
        7: 1,
        8: 1,
      });
    }

    ['@test component helper destroys underlying component when it is swapped out'](assert) {
      let destroyed = { 'foo-bar': 0, 'foo-bar-baz': 0 };
      let testContext = this;

      this.registerComponent('foo-bar', {
        template: 'hello from foo-bar',
        ComponentClass: Component.extend({
          willDestroyElement() {
            assert.equal(
              testContext.$(`#${this.elementId}`).length,
              1,
              'element is still attached to the document'
            );
          },

          willDestroy() {
            this._super();
            destroyed['foo-bar']++;
          },
        }),
      });

      this.registerComponent('foo-bar-baz', {
        template: 'hello from foo-bar-baz',
        ComponentClass: Component.extend({
          willDestroy() {
            this._super();
            destroyed['foo-bar-baz']++;
          },
        }),
      });

      this.render('{{component this.componentName name=this.name}}', {
        componentName: 'foo-bar',
      });

      assert.deepEqual(destroyed, { 'foo-bar': 0, 'foo-bar-baz': 0 });

      runTask(() => this.rerender());

      assert.deepEqual(destroyed, { 'foo-bar': 0, 'foo-bar-baz': 0 });

      runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

      assert.deepEqual(destroyed, { 'foo-bar': 1, 'foo-bar-baz': 0 });

      runTask(() => set(this.context, 'componentName', 'foo-bar'));

      assert.deepEqual(destroyed, { 'foo-bar': 1, 'foo-bar-baz': 1 });
    }

    ['@test component helper with bound properties are updating correctly in init of component']() {
      this.registerComponent('foo-bar', {
        template: 'foo-bar {{this.location}} {{this.locationCopy}} {{yield}}',
        ComponentClass: Component.extend({
          init: function () {
            this._super(...arguments);
            this.set('locationCopy', this.get('location'));
          },
        }),
      });

      this.registerComponent('foo-bar-baz', {
        template: 'foo-bar-baz {{this.location}} {{this.locationCopy}} {{yield}}',
        ComponentClass: Component.extend({
          init: function () {
            this._super(...arguments);
            this.set('locationCopy', this.get('location'));
          },
        }),
      });

      this.registerComponent('outer-component', {
        template: '{{#component this.componentName location=this.location}}arepas!{{/component}}',
        ComponentClass: Component.extend({
          componentName: computed('location', function () {
            if (this.get('location') === 'Caracas') {
              return 'foo-bar';
            } else {
              return 'foo-bar-baz';
            }
          }),
        }),
      });

      this.render('{{outer-component location=this.location}}', {
        location: 'Caracas',
      });

      this.assertText('foo-bar Caracas Caracas arepas!');

      runTask(() => this.rerender());

      this.assertText('foo-bar Caracas Caracas arepas!');

      runTask(() => set(this.context, 'location', 'Loisaida'));

      this.assertText('foo-bar-baz Loisaida Loisaida arepas!');

      runTask(() => set(this.context, 'location', 'Caracas'));

      this.assertText('foo-bar Caracas Caracas arepas!');
    }

    ['@test component helper with actions'](assert) {
      this.registerComponent('inner-component', {
        template: 'inner-component {{yield}}',
        ComponentClass: Component.extend({
          classNames: 'inner-component',
          didInsertElement() {
            // trigger action on click in absence of app's EventDispatcher
            let sendAction = (this.eventHandler = () => {
              if (this.somethingClicked) {
                this.somethingClicked();
              }
            });
            this.element.addEventListener('click', sendAction);
          },
          willDestroyElement() {
            this.element.removeEventListener('click', this.eventHandler);
          },
        }),
      });

      let actionTriggered = 0;
      this.registerComponent('outer-component', {
        template:
          '{{#component this.componentName somethingClicked=(action "mappedAction")}}arepas!{{/component}}',
        ComponentClass: Component.extend({
          classNames: 'outer-component',
          componentName: 'inner-component',
          actions: {
            mappedAction() {
              actionTriggered++;
            },
          },
        }),
      });

      this.render('{{outer-component}}');

      assert.equal(actionTriggered, 0, 'action was not triggered');

      runTask(() => {
        this.$('.inner-component').click();
      });

      assert.equal(actionTriggered, 1, 'action was triggered');
    }

    ['@test nested component helpers']() {
      this.registerComponent('foo-bar', {
        template: 'yippie! {{@location}} {{yield}}',
      });
      this.registerComponent('baz-qux', {
        template: 'yummy {{@location}} {{yield}}',
      });
      this.registerComponent('corge-grault', {
        template: 'delicious {{@location}} {{yield}}',
      });

      this.render(
        '{{#component this.componentName1 location=this.location}}{{#component this.componentName2 location=this.location}}arepas!{{/component}}{{/component}}',
        {
          componentName1: 'foo-bar',
          componentName2: 'baz-qux',
          location: 'Caracas',
        }
      );

      this.assertText('yippie! Caracas yummy Caracas arepas!');

      runTask(() => this.rerender());

      this.assertText('yippie! Caracas yummy Caracas arepas!');

      runTask(() => set(this.context, 'location', 'Loisaida'));

      this.assertText('yippie! Loisaida yummy Loisaida arepas!');

      runTask(() => set(this.context, 'componentName1', 'corge-grault'));

      this.assertText('delicious Loisaida yummy Loisaida arepas!');

      runTask(() => {
        set(this.context, 'componentName1', 'foo-bar');
        set(this.context, 'location', 'Caracas');
      });

      this.assertText('yippie! Caracas yummy Caracas arepas!');
    }

    ['@test component with dynamic name argument resolving to non-existent component'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        this.render('{{component this.componentName}}', {
          componentName: 'does-not-exist',
        });
      }, /Attempted to resolve `does-not-exist`, which was expected to be a component, but nothing was found./);
    }

    ['@test component with static name argument for non-existent component'](assert) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }

      assert.throws(() => {
        this.render('{{component "does-not-exist"}}');
      }, /Attempted to resolve `does-not-exist`, which was expected to be a component, but nothing was found./);
    }

    ['@test component with dynamic component name resolving to a component, then non-existent component']() {
      this.registerComponent('foo-bar', { template: 'hello {{this.name}}' });

      this.render('{{component this.componentName name=this.name}}', {
        componentName: 'foo-bar',
        name: 'Alex',
      });

      this.assertText('hello Alex');

      runTask(() => this.rerender());

      this.assertText('hello Alex');

      runTask(() => set(this.context, 'componentName', undefined));

      this.assertText('');

      runTask(() => set(this.context, 'componentName', 'foo-bar'));

      this.assertText('hello Alex');
    }

    ['@test component helper properly invalidates hash params inside an {{each}} invocation #11044']() {
      this.registerComponent('foo-bar', {
        template: '[{{this.internalName}} - {{this.name}}]',
        ComponentClass: Component.extend({
          willRender() {
            // store internally available name to ensure that the name available in `this.attrs.name`
            // matches the template lookup name
            set(this, 'internalName', this.get('name'));
          },
        }),
      });

      this.render('{{#each this.items as |item|}}{{component "foo-bar" name=item.name}}{{/each}}', {
        items: [{ name: 'Robert' }, { name: 'Jacquie' }],
      });

      this.assertText('[Robert - Robert][Jacquie - Jacquie]');

      runTask(() => this.rerender());

      this.assertText('[Robert - Robert][Jacquie - Jacquie]');

      runTask(() => set(this.context, 'items', [{ name: 'Max' }, { name: 'James' }]));

      this.assertText('[Max - Max][James - James]');

      runTask(() => set(this.context, 'items', [{ name: 'Robert' }, { name: 'Jacquie' }]));

      this.assertText('[Robert - Robert][Jacquie - Jacquie]');
    }

    ['@test positional parameters does not clash when rendering different components']() {
      this.registerComponent('foo-bar', {
        template: 'hello {{this.name}} ({{this.age}}) from foo-bar',
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name', 'age'],
        }),
      });

      this.registerComponent('foo-bar-baz', {
        template: 'hello {{this.name}} ({{this.age}}) from foo-bar-baz',
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name', 'age'],
        }),
      });

      this.render('{{component this.componentName this.name this.age}}', {
        componentName: 'foo-bar',
        name: 'Alex',
        age: 29,
      });

      this.assertComponentElement(this.firstChild, {
        content: 'hello Alex (29) from foo-bar',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'hello Alex (29) from foo-bar',
      });

      runTask(() => set(this.context, 'name', 'Ben'));

      this.assertComponentElement(this.firstChild, {
        content: 'hello Ben (29) from foo-bar',
      });

      runTask(() => set(this.context, 'age', 22));

      this.assertComponentElement(this.firstChild, {
        content: 'hello Ben (22) from foo-bar',
      });

      runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

      this.assertComponentElement(this.firstChild, {
        content: 'hello Ben (22) from foo-bar-baz',
      });

      runTask(() => {
        set(this.context, 'componentName', 'foo-bar');
        set(this.context, 'name', 'Alex');
        set(this.context, 'age', 29);
      });

      this.assertComponentElement(this.firstChild, {
        content: 'hello Alex (29) from foo-bar',
      });
    }

    ['@test positional parameters does not pollute the attributes when changing components']() {
      this.registerComponent('normal-message', {
        template: 'Normal: {{this.something}}!',
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['something'],
        }),
      });

      this.registerComponent('alternative-message', {
        template: 'Alternative: {{this.something}} {{this.somethingElse}}!',
        ComponentClass: Component.extend({
          something: 'Another',
        }).reopenClass({
          positionalParams: ['somethingElse'],
        }),
      });

      this.render('{{component this.componentName this.message}}', {
        componentName: 'normal-message',
        message: 'Hello',
      });

      this.assertComponentElement(this.firstChild, {
        content: 'Normal: Hello!',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'Normal: Hello!',
      });

      runTask(() => set(this.context, 'componentName', 'alternative-message'));

      this.assertComponentElement(this.firstChild, {
        content: 'Alternative: Another Hello!',
      });

      runTask(() => set(this.context, 'message', 'Hi'));

      this.assertComponentElement(this.firstChild, {
        content: 'Alternative: Another Hi!',
      });

      runTask(() => {
        set(this.context, 'componentName', 'normal-message');
        set(this.context, 'message', 'Hello');
      });

      this.assertComponentElement(this.firstChild, {
        content: 'Normal: Hello!',
      });
    }

    ['@test static arbitrary number of positional parameters']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'names',
        }),
        template: strip`
        {{#each this.names as |name|}}
          {{name}}
        {{/each}}`,
      });

      this.render(`{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" elementId="helper"}}`);

      this.assertText('Foo4Bar5Baz');

      runTask(() => this.rerender());

      this.assertText('Foo4Bar5Baz');
    }

    ['@test dynamic arbitrary number of positional parameters']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'n',
        }),
        template: strip`
        {{#each this.n as |name|}}
          {{name}}
        {{/each}}`,
      });

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

    ['@test component helper emits useful backtracking re-render assertion message']() {
      this.registerComponent('outer-component', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.set('person', {
              name: 'Alex',
              toString() {
                return `Person (${this.name})`;
              },
            });
          },
        }),
        template: `Hi {{this.person.name}}! {{component "error-component" person=this.person}}`,
      });

      this.registerComponent('error-component', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.set('person.name', 'Ben');
          },
        }),
        template: '{{this.person.name}}',
      });

      let expectedBacktrackingMessage = backtrackingMessageFor('name', 'Person \\(Ben\\)', {
        renderTree: ['outer-component', 'this.person.name'],
      });

      expectAssertion(() => {
        this.render('{{component this.componentName}}', {
          componentName: 'outer-component',
        });
      }, expectedBacktrackingMessage);
    }
  }
);
