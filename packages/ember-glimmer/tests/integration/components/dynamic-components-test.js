import { set, computed } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { isFeatureEnabled } from 'ember-debug';

moduleFor('Components test: dynamic components', class extends RenderingTest {

  ['@test it can render a basic component with a static component name argument']() {
    this.registerComponent('foo-bar', { template: 'hello {{name}}' });

    this.render('{{component "foo-bar" name=name}}', { name: 'Sarah' });

    this.assertComponentElement(this.firstChild, { content: 'hello Sarah' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello Sarah' });

    this.runTask(() => set(this.context, 'name', 'Gavin'));

    this.assertComponentElement(this.firstChild, { content: 'hello Gavin' });

    this.runTask(() => set(this.context, 'name', 'Sarah'));

    this.assertComponentElement(this.firstChild, { content: 'hello Sarah' });
  }

  ['@test it can render a basic component with a dynamic component name argument']() {
    this.registerComponent('foo-bar', { template: 'hello {{name}} from foo-bar' });
    this.registerComponent('foo-bar-baz', { template: 'hello {{name}} from foo-bar-baz' });

    this.render('{{component componentName name=name}}', { componentName: 'foo-bar', name: 'Alex' });

    this.assertComponentElement(this.firstChild, { content: 'hello Alex from foo-bar' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello Alex from foo-bar' });

    this.runTask(() => set(this.context, 'name', 'Ben'));

    this.assertComponentElement(this.firstChild, { content: 'hello Ben from foo-bar' });

    this.runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

    this.assertComponentElement(this.firstChild, { content: 'hello Ben from foo-bar-baz' });

    this.runTask(() => {
      set(this.context, 'componentName', 'foo-bar');
      set(this.context, 'name', 'Alex');
    });

    this.assertComponentElement(this.firstChild, { content: 'hello Alex from foo-bar' });
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

    this.render('{{component "foo-bar"}}');

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

    this.render('{{component "foo-bar"}}');

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

    this.render('<span class="outer">outer</span>{{component "foo-bar"}}');

    let $span = instance.$('span');

    assert.equal($span.length, 1);
    assert.equal($span.attr('class'), 'inner');

    this.runTask(() => this.rerender());

    $span = instance.$('span');

    assert.equal($span.length, 1);
    assert.equal($span.attr('class'), 'inner');
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

    this.render('{{component "foo-bar"}}');
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

    this.render('{{#component "foo-bar"}}hello{{/component}}');

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

    this.render('{{component "foo-bar"}}');

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

    this.render('{{#component "foo-bar"}}{{message}}{{/component}}', { message: 'hello' });

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
        {{#component "foo-bar" id=1}}
          {{#if cond2}}
            {{#component "foo-bar" id=2}}{{/component}}
            {{#if cond3}}
              {{#component "foo-bar" id=3}}
                {{#if cond4}}
                  {{#component "foo-bar" id=4}}
                    {{#if cond5}}
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

  ['@test component helper destroys underlying component when it is swapped out'](assert) {
    let destroyed = { 'foo-bar': 0, 'foo-bar-baz': 0 };
    let testContext = this;

    this.registerComponent('foo-bar', {
      template: 'hello from foo-bar',
      ComponentClass: Component.extend({
        willDestroyElement() {
          assert.equal(testContext.$(`#${this.elementId}`).length, 1, 'element is still attached to the document');
        },

        willDestroy() {
          this._super();
          destroyed['foo-bar']++;
        }
      })
    });

    this.registerComponent('foo-bar-baz', {
      template: 'hello from foo-bar-baz',
      ComponentClass: Component.extend({
        willDestroy() {
          this._super();
          destroyed['foo-bar-baz']++;
        }
      })
    });

    this.render('{{component componentName name=name}}', { componentName: 'foo-bar' });

    assert.deepEqual(destroyed, { 'foo-bar': 0, 'foo-bar-baz': 0 });

    this.runTask(() => this.rerender());

    assert.deepEqual(destroyed, { 'foo-bar': 0, 'foo-bar-baz': 0 });

    this.runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

    assert.deepEqual(destroyed, { 'foo-bar': 1, 'foo-bar-baz': 0 });

    this.runTask(() => set(this.context, 'componentName', 'foo-bar'));

    assert.deepEqual(destroyed, { 'foo-bar': 1, 'foo-bar-baz': 1 });
  }

  ['@test component helper with bound properties are updating correctly in init of component'](assert) {
    this.registerComponent('foo-bar', {
      template: 'foo-bar {{location}} {{locationCopy}} {{yield}}',
      ComponentClass: Component.extend({
        init: function() {
          this._super(...arguments);
          this.set('locationCopy', this.get('location'));
        }
      })
    });

    this.registerComponent('foo-bar-baz', {
      template: 'foo-bar-baz {{location}} {{locationCopy}} {{yield}}',
      ComponentClass: Component.extend({
        init: function() {
          this._super(...arguments);
          this.set('locationCopy', this.get('location'));
        }
      })
    });

    this.registerComponent('outer-component', {
      template: '{{#component componentName location=location}}arepas!{{/component}}',
      ComponentClass: Component.extend({
        componentName: computed('location', function() {
          if (this.get('location') === 'Caracas') {
            return 'foo-bar';
          } else {
            return 'foo-bar-baz';
          }
        })
      })
    });

    this.render('{{outer-component location=location}}', { location: 'Caracas' });

    this.assertText('foo-bar Caracas Caracas arepas!');

    this.runTask(() => this.rerender());

    this.assertText('foo-bar Caracas Caracas arepas!');

    this.runTask(() => set(this.context, 'location', 'Loisaida'));

    this.assertText('foo-bar-baz Loisaida Loisaida arepas!');

    this.runTask(() => set(this.context, 'location', 'Caracas'));

    this.assertText('foo-bar Caracas Caracas arepas!');
  }

  ['@test component helper with actions'](assert) {
    this.registerComponent('inner-component', {
      template: 'inner-component {{yield}}',
      ComponentClass: Component.extend({
        classNames: 'inner-component',
        didInsertElement() {
          // trigger action on click in absence of app's EventDispatcher
          this.$().on('click', () => {
            this.sendAction('somethingClicked');
          });
        },
        willDestroyElement() {
          this.$().off('click');
        }
      })
    });

    let actionTriggered = 0;
    this.registerComponent('outer-component', {
      template: '{{#component componentName somethingClicked="mappedAction"}}arepas!{{/component}}',
      ComponentClass: Component.extend({
        classNames: 'outer-component',
        componentName: 'inner-component',
        actions: {
          mappedAction() {
            actionTriggered++;
          }
        }
      })
    });

    this.render('{{outer-component}}');

    assert.equal(actionTriggered, 0, 'action was not triggered');

    this.runTask(() => {
      this.$('.inner-component').trigger('click');
    });

    assert.equal(actionTriggered, 1, 'action was triggered');
  }

  ['@test nested component helpers'](assert) {
    this.registerComponent('foo-bar', { template: 'yippie! {{attrs.location}} {{yield}}' });
    this.registerComponent('baz-qux', { template: 'yummy {{attrs.location}} {{yield}}' });
    this.registerComponent('corge-grault', { template: 'delicious {{attrs.location}} {{yield}}' });

    this.render('{{#component componentName1 location=location}}{{#component componentName2 location=location}}arepas!{{/component}}{{/component}}', {
      componentName1: 'foo-bar',
      componentName2: 'baz-qux',
      location: 'Caracas'
    });

    this.assertText('yippie! Caracas yummy Caracas arepas!');

    this.runTask(() => this.rerender());

    this.assertText('yippie! Caracas yummy Caracas arepas!');

    this.runTask(() => set(this.context, 'location', 'Loisaida'));

    this.assertText('yippie! Loisaida yummy Loisaida arepas!');

    this.runTask(() => set(this.context, 'componentName1', 'corge-grault'));

    this.assertText('delicious Loisaida yummy Loisaida arepas!');

    this.runTask(() => {
      set(this.context, 'componentName1', 'foo-bar');
      set(this.context, 'location', 'Caracas');
    });

    this.assertText('yippie! Caracas yummy Caracas arepas!');
  }

  ['@test component with dynamic name argument resolving to non-existent component'](assert) {
    expectAssertion(() => {
      this.render('{{component componentName}}', { componentName: 'does-not-exist' });
    }, /Could not find component named "does-not-exist"/);
  }

  ['@test component with static name argument for non-existent component'](assert) {
    expectAssertion(() => {
      this.render('{{component "does-not-exist"}}');
    }, /Could not find component named "does-not-exist"/);
  }

  ['@test component with dynamic component name resolving to a component, then non-existent component'](assert) {
    this.registerComponent('foo-bar', { template: 'hello {{name}}' });

    this.render('{{component componentName name=name}}', { componentName: 'foo-bar', name: 'Alex' });

    this.assertText('hello Alex');

    this.runTask(() => this.rerender());

    this.assertText('hello Alex');

    this.runTask(() => set(this.context, 'componentName', undefined));

    this.assertText('');

    this.runTask(() => set(this.context, 'componentName', 'foo-bar'));

    this.assertText('hello Alex');
  }

  ['@test component helper properly invalidates hash params inside an {{each}} invocation #11044'](assert) {
    this.registerComponent('foo-bar', {
      template: '[{{internalName}} - {{name}}]',
      ComponentClass: Component.extend({
        willRender() {
          // store internally available name to ensure that the name available in `this.attrs.name`
          // matches the template lookup name
          set(this, 'internalName', this.get('name'));
        }
      })
    });

    this.render('{{#each items as |item|}}{{component "foo-bar" name=item.name}}{{/each}}', {
      items: [
        { name: 'Robert' },
        { name: 'Jacquie' }
      ]
    });

    this.assertText('[Robert - Robert][Jacquie - Jacquie]');

    this.runTask(() => this.rerender());

    this.assertText('[Robert - Robert][Jacquie - Jacquie]');

    this.runTask(() => set(this.context, 'items', [
      { name: 'Max' },
      { name: 'James' }
    ]));

    this.assertText('[Max - Max][James - James]');

    this.runTask(() => set(this.context, 'items', [
      { name: 'Robert' },
      { name: 'Jacquie' }
    ]));

    this.assertText('[Robert - Robert][Jacquie - Jacquie]');
  }

  ['@test dashless components should not be found'](assert) {
    this.registerComponent('dashless2', { template: 'Do not render me!' });

    expectAssertion(() => {
      this.render('{{component "dashless"}}');
    }, /You cannot use 'dashless' as a component name. Component names must contain a hyphen./);
  }

  ['@test positional parameters does not clash when rendering different components'](assert) {
    this.registerComponent('foo-bar', {
      template: 'hello {{name}} ({{age}}) from foo-bar',
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name', 'age']
      })
    });

    this.registerComponent('foo-bar-baz', {
      template: 'hello {{name}} ({{age}}) from foo-bar-baz',
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['name', 'age']
      })
    });

    this.render('{{component componentName name age}}', {
      componentName: 'foo-bar',
      name: 'Alex',
      age: 29
    });

    this.assertComponentElement(this.firstChild, { content: 'hello Alex (29) from foo-bar' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello Alex (29) from foo-bar' });

    this.runTask(() => set(this.context, 'name', 'Ben'));

    this.assertComponentElement(this.firstChild, { content: 'hello Ben (29) from foo-bar' });

    this.runTask(() => set(this.context, 'age', 22));

    this.assertComponentElement(this.firstChild, { content: 'hello Ben (22) from foo-bar' });

    this.runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

    this.assertComponentElement(this.firstChild, { content: 'hello Ben (22) from foo-bar-baz' });

    this.runTask(() => {
      set(this.context, 'componentName', 'foo-bar');
      set(this.context, 'name', 'Alex');
      set(this.context, 'age', 29);
    });

    this.assertComponentElement(this.firstChild, { content: 'hello Alex (29) from foo-bar' });
  }

  ['@test positional parameters does not pollute the attributes when changing components'](assert) {
    this.registerComponent('normal-message', {
      template: 'Normal: {{something}}!',
      ComponentClass: Component.extend().reopenClass({
        positionalParams: ['something']
      })
    });

    this.registerComponent('alternative-message', {
      template: 'Alternative: {{something}} {{somethingElse}}!',
      ComponentClass: Component.extend({
        something: 'Another'
      }).reopenClass({
        positionalParams: ['somethingElse']
      })
    });

    this.render('{{component componentName message}}', { componentName: 'normal-message', message: 'Hello' });

    this.assertComponentElement(this.firstChild, { content: 'Normal: Hello!' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'Normal: Hello!' });

    this.runTask(() => set(this.context, 'componentName', 'alternative-message'));

    this.assertComponentElement(this.firstChild, { content: 'Alternative: Another Hello!' });

    this.runTask(() => set(this.context, 'message', 'Hi'));

    this.assertComponentElement(this.firstChild, { content: 'Alternative: Another Hi!' });

    this.runTask(() => {
      set(this.context, 'componentName', 'normal-message');
      set(this.context, 'message', 'Hello');
    });

    this.assertComponentElement(this.firstChild, { content: 'Normal: Hello!' });
  }

  ['@test static arbitrary number of positional parameters'](assert) {
    this.registerComponent('sample-component', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'names'
      }),
      template: strip`
        {{#each names as |name|}}
          {{name}}
        {{/each}}`
    });

    this.render(`{{component "sample-component" "Foo" 4 "Bar" 5 "Baz" elementId="helper"}}`);

    this.assertText('Foo4Bar5Baz');

    this.runTask(() => this.rerender());

    this.assertText('Foo4Bar5Baz');
  }

  ['@test dynamic arbitrary number of positional parameters'](assert) {
    this.registerComponent('sample-component', {
      ComponentClass: Component.extend().reopenClass({
        positionalParams: 'n'
      }),
      template: strip`
        {{#each n as |name|}}
          {{name}}
        {{/each}}`
    });

    this.render(`{{component "sample-component" user1 user2}}`,
      {
        user1: 'Foo',
        user2: 4
      }
    );

    this.assertText('Foo4');

    this.runTask(() => this.rerender());

    this.assertText('Foo4');

    this.runTask(() => this.context.set('user1', 'Bar'));

    this.assertText('Bar4');

    this.runTask(() => this.context.set('user2', '5'));

    this.assertText('Bar5');

    this.runTask(() => {
      this.context.set('user1', 'Foo');
      this.context.set('user2', 4);
    });

    this.assertText('Foo4');
  }

  ['@test component helper emits useful backtracking re-render assertion message'](assert) {
    this.registerComponent('outer-component', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          this.set('person', { name: 'Alex' });
        }
      }),
      template: `Hi {{person.name}}! {{component "error-component" person=person}}`
    });

    this.registerComponent('error-component', {
      ComponentClass: Component.extend({
        init() {
          this._super(...arguments);
          this.set('person.name', { name: 'Ben' });
        }
      }),
      template: '{{person.name}}'
    });

    let expectedBacktrackingMessage = /modified "person\.name" twice on \[object Object\] in a single render\. It was rendered in "component:outer-component" and modified in "component:error-component"/;

    if (isFeatureEnabled('ember-glimmer-allow-backtracking-rerender')) {
      expectDeprecation(expectedBacktrackingMessage);
      this.render('{{component componentName}}', { componentName: 'outer-component' });
    } else {
      expectAssertion(() => {
        this.render('{{component componentName}}', { componentName: 'outer-component' });
      }, expectedBacktrackingMessage);
    }
  }
});
