import {
  moduleFor,
  RenderingTestCase,
  strip,
  classes,
  equalTokens,
  equalsElement,
  runTask,
  runLoopSettled,
} from 'internal-test-helpers';

import { run } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { tracked } from '@ember/-internals/metal';
import { alias } from '@ember/object/computed';
import { on } from '@ember/object/evented';
import Service, { service } from '@ember/service';
import EmberObject, { set, get, computed, observer } from '@ember/object';
import { A as emberA } from '@ember/array';

import { Component, compile, htmlSafe } from '../../utils/helpers';
import { backtrackingMessageFor } from '../../utils/debug-stack';

moduleFor(
  'Components test: curly components',
  class extends RenderingTestCase {
    ['@test it can render a basic component']() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    ['@test it can have a custom id and it is not bound']() {
      this.registerComponent('foo-bar', { template: '{{this.id}} {{this.elementId}}' });

      this.render('{{foo-bar id=this.customId}}', {
        customId: 'bizz',
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'bizz' },
        content: 'bizz bizz',
      });

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

    ['@test elementId cannot change'](assert) {
      let component;
      let FooBarComponent = Component.extend({
        elementId: 'blahzorz',
        init() {
          this._super(...arguments);
          component = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{this.elementId}}',
      });

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { id: 'blahzorz' },
        content: 'blahzorz',
      });

      if (DEBUG) {
        let willThrow = () => run(null, set, component, 'elementId', 'herpyderpy');

        assert.throws(willThrow, /Changing a view's elementId after creation is not allowed/);

        this.assertComponentElement(this.firstChild, {
          tagName: 'div',
          attrs: { id: 'blahzorz' },
          content: 'blahzorz',
        });
      }
    }

    ['@test elementId is stable when other values change']() {
      let changingArg = 'arbitrary value';
      let parentInstance;
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            parentInstance = this;
          },
          changingArg: changingArg,
        }),
        template: '{{quux-baz elementId="stable-id" changingArg=this.changingArg}}',
      });

      this.registerComponent('quux-baz', {
        ComponentClass: Component.extend({}),
        template: '{{this.changingArg}}',
      });

      this.render('{{foo-bar}}');
      this.assertComponentElement(this.firstChild.firstChild, {
        attrs: { id: 'stable-id' },
        content: 'arbitrary value',
      });

      changingArg = 'a different value';
      runTask(() => set(parentInstance, 'changingArg', changingArg));
      this.assertComponentElement(this.firstChild.firstChild, {
        attrs: { id: 'stable-id' },
        content: changingArg,
      });
    }

    ['@test can specify template with `layoutName` property']() {
      let FooBarComponent = Component.extend({
        elementId: 'blahzorz',
        layoutName: 'fizz-bar',
        init() {
          this._super(...arguments);
          this.local = 'hey';
        },
      });

      this.registerTemplate('fizz-bar', `FIZZ BAR {{this.local}}`);

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar}}');

      this.assertText('FIZZ BAR hey');
    }

    ['@test layout supports computed property']() {
      let FooBarComponent = Component.extend({
        elementId: 'blahzorz',
        layout: computed(function () {
          return compile('so much layout wat {{this.lulz}}');
        }),
        init() {
          this._super(...arguments);
          this.lulz = 'heyo';
        },
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar}}');

      this.assertText('so much layout wat heyo');
    }

    ['@test passing undefined elementId results in a default elementId'](assert) {
      let FooBarComponent = Component.extend({
        tagName: 'h1',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'something',
      });

      this.render('{{foo-bar id=this.somethingUndefined}}');

      let foundId = this.$('h1').attr('id');
      assert.ok(
        /^ember/.test(foundId),
        'Has a reasonable id attribute (found id=' + foundId + ').'
      );

      runTask(() => this.rerender());

      let newFoundId = this.$('h1').attr('id');
      assert.ok(
        /^ember/.test(newFoundId),
        'Has a reasonable id attribute (found id=' + newFoundId + ').'
      );

      assert.equal(foundId, newFoundId);
    }

    ['@test id is an alias for elementId'](assert) {
      let FooBarComponent = Component.extend({
        tagName: 'h1',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'something',
      });

      this.render('{{foo-bar id="custom-id"}}');

      let foundId = this.$('h1').attr('id');
      assert.equal(foundId, 'custom-id');

      runTask(() => this.rerender());

      let newFoundId = this.$('h1').attr('id');
      assert.equal(newFoundId, 'custom-id');

      assert.equal(foundId, newFoundId);
    }

    ['@test cannot pass both id and elementId at the same time']() {
      this.registerComponent('foo-bar', { template: '' });

      expectAssertion(() => {
        this.render('{{foo-bar id="zomg" elementId="lol"}}');
      }, /You cannot invoke a component with both 'id' and 'elementId' at the same time./);
    }

    ['@test it can have a custom tagName']() {
      let FooBarComponent = Component.extend({
        tagName: 'foo-bar',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar}}');

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

    ['@test it can have a custom tagName set in the constructor']() {
      let FooBarComponent = Component.extend({
        init() {
          this._super();
          this.tagName = 'foo-bar';
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar}}');

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

    ['@test it can have a custom tagName from the invocation']() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('{{foo-bar tagName="foo-bar"}}');

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

    ['@test tagName can not be a computed property']() {
      let FooBarComponent = Component.extend({
        tagName: computed(function () {
          return 'foo-bar';
        }),
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You cannot use a computed property for the component's `tagName` \(<.+?>\)\./);
    }

    ['@test class is applied before didInsertElement'](assert) {
      let componentClass;
      let FooBarComponent = Component.extend({
        didInsertElement() {
          componentClass = this.element.className;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar class="foo-bar"}}');

      assert.equal(componentClass, 'foo-bar ember-view');
    }

    ['@test it can have custom classNames']() {
      let FooBarComponent = Component.extend({
        classNames: ['foo', 'bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar}}');

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

    ['@test should not apply falsy class name']() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('{{foo-bar class=this.somethingFalsy}}', {
        somethingFalsy: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });
    }

    ['@test should update class using inline if, initially false, no alternate']() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('{{foo-bar class=(if this.predicate "thing") }}', {
        predicate: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', true));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view thing') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', false));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });
    }

    ['@test should update class using inline if, initially true, no alternate']() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('{{foo-bar class=(if this.predicate "thing") }}', {
        predicate: true,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view thing') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', false));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: 'ember-view' },
        content: 'hello',
      });

      runTask(() => set(this.context, 'predicate', true));
      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view thing') },
        content: 'hello',
      });
    }

    ['@test class property on components can be dynamic']() {
      this.registerComponent('foo-bar', { template: 'hello' });

      this.render('{{foo-bar class=(if this.fooBar "foo-bar")}}', {
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

    ['@test it can have custom classNames from constructor']() {
      let FooBarComponent = Component.extend({
        init() {
          this._super();
          this.classNames = this.classNames.slice();
          this.classNames.push('foo', 'bar', `outside-${this.get('extraClass')}`);
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar extraClass="baz"}}');

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar outside-baz') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo bar outside-baz') },
        content: 'hello',
      });
    }

    ['@test it can set custom classNames from the invocation']() {
      let FooBarComponent = Component.extend({
        classNames: ['foo'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render(strip`
      {{foo-bar class="bar baz"}}
      {{foo-bar classNames="bar baz"}}
      {{foo-bar}}
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

      this.render('{{foo-bar}}');

      let element1 = instance.element;

      this.assertComponentElement(element1, { content: 'hello' });

      runTask(() => this.rerender());

      let element2 = instance.element;

      this.assertComponentElement(element2, { content: 'hello' });

      this.assertSameNode(element2, element1);
    }

    ['@test an empty component does not have childNodes'](assert) {
      let fooBarInstance;
      let FooBarComponent = Component.extend({
        tagName: 'input',
        init() {
          this._super();
          fooBarInstance = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '',
      });

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, { tagName: 'input' });

      assert.strictEqual(fooBarInstance.element.childNodes.length, 0);

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { tagName: 'input' });

      assert.strictEqual(fooBarInstance.element.childNodes.length, 0);
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

      this.render('{{foo-bar}}');
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

    ['@test it renders passed named arguments']() {
      this.registerComponent('foo-bar', {
        template: '{{@foo}}',
      });

      this.render('{{foo-bar foo=this.model.bar}}', {
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

    ['@test it reflects named arguments as properties']() {
      this.registerComponent('foo-bar', {
        template: '{{this.foo}}',
      });

      this.render('{{foo-bar foo=this.model.bar}}', {
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

    ['@test it can render a basic component with a block']() {
      this.registerComponent('foo-bar', {
        template: '{{yield}} - In component',
      });

      this.render('{{#foo-bar}}hello{{/foo-bar}}');

      this.assertComponentElement(this.firstChild, {
        content: 'hello - In component',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        content: 'hello - In component',
      });
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

      this.render('{{foo-bar}}');

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

      this.render('{{#foo-bar}}{{this.message}}{{/foo-bar}}', { message: 'hello' });

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => set(this.context, 'message', 'goodbye'));

      this.assertComponentElement(this.firstChild, { content: 'goodbye' });

      runTask(() => set(this.context, 'message', 'hello'));

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    ['@test it can yield a block param named for reserved words [GH#14096]']() {
      let instance;

      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          instance = this;
        },

        name: 'foo-bar',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{yield this}}',
      });

      this.render('{{#foo-bar as |component|}}{{component.name}}{{/foo-bar}}');

      this.assertComponentElement(this.firstChild, { content: 'foo-bar' });

      this.assertStableRerender();

      runTask(() => set(instance, 'name', 'derp-qux'));

      this.assertComponentElement(this.firstChild, { content: 'derp-qux' });

      runTask(() => set(instance, 'name', 'foo-bar'));

      this.assertComponentElement(this.firstChild, { content: 'foo-bar' });
    }

    ['@test it can yield internal and external properties positionally']() {
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
        template: '{{yield this.greeting this.greetee.firstName}}',
      });

      this.render(
        '{{#foo-bar greetee=this.person as |greeting name|}}{{name}} {{this.person.lastName}}, {{greeting}}{{/foo-bar}}',
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

    ['@test #11519 - block param infinite loop']() {
      let instance;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          instance = this;
        },
        danger: 0,
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{this.danger}}{{yield this.danger}}',
      });

      // On initial render, create streams. The bug will not have manifested yet, but at this point
      // we have created streams that create a circular invalidation.
      this.render(`{{#foo-bar as |dangerBlockParam|}}{{/foo-bar}}`);

      this.assertText('0');

      // Trigger a non-revalidating re-render. The yielded block will not be dirtied
      // nor will block param streams, and thus no infinite loop will occur.
      runTask(() => this.rerender());

      this.assertText('0');

      // Trigger a revalidation, which will cause an infinite loop without the fix
      // in place.  Note that we do not see the infinite loop is in testing mode,
      // because a deprecation warning about re-renders is issued, which Ember
      // treats as an exception.
      runTask(() => set(instance, 'danger', 1));

      this.assertText('1');

      runTask(() => set(instance, 'danger', 0));

      this.assertText('0');
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
        {{#foo-bar id=1}}
          {{#if this.cond2}}
            {{#foo-bar id=2}}{{/foo-bar}}
            {{#if this.cond3}}
              {{#foo-bar id=3}}
                {{#if this.cond4}}
                  {{#foo-bar id=4}}
                    {{#if this.cond5}}
                      {{#foo-bar id=5}}{{/foo-bar}}
                      {{#foo-bar id=6}}{{/foo-bar}}
                      {{#foo-bar id=7}}{{/foo-bar}}
                    {{/if}}
                    {{#foo-bar id=8}}{{/foo-bar}}
                  {{/foo-bar}}
                {{/if}}
              {{/foo-bar}}
            {{/if}}
          {{/if}}
        {{/foo-bar}}
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

    ['@test should escape HTML in normal mustaches']() {
      let component;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        },
        output: 'you need to be more <b>bold</b>',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{this.output}}',
      });

      this.render('{{foo-bar}}');

      this.assertText('you need to be more <b>bold</b>');

      runTask(() => this.rerender());

      this.assertText('you need to be more <b>bold</b>');

      runTask(() => set(component, 'output', 'you are so <i>super</i>'));

      this.assertText('you are so <i>super</i>');

      runTask(() => set(component, 'output', 'you need to be more <b>bold</b>'));
    }

    ['@test should not escape HTML in triple mustaches']() {
      let expectedHtmlBold = 'you need to be more <b>bold</b>';
      let expectedHtmlItalic = 'you are so <i>super</i>';
      let component;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        },
        output: expectedHtmlBold,
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{{this.output}}}',
      });

      this.render('{{foo-bar}}');

      equalTokens(this.firstChild, expectedHtmlBold);

      runTask(() => this.rerender());

      equalTokens(this.firstChild, expectedHtmlBold);

      runTask(() => set(component, 'output', expectedHtmlItalic));

      equalTokens(this.firstChild, expectedHtmlItalic);

      runTask(() => set(component, 'output', expectedHtmlBold));

      equalTokens(this.firstChild, expectedHtmlBold);
    }

    ['@test should not escape HTML if string is a htmlSafe']() {
      let expectedHtmlBold = 'you need to be more <b>bold</b>';
      let expectedHtmlItalic = 'you are so <i>super</i>';
      let component;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        },
        output: htmlSafe(expectedHtmlBold),
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '{{this.output}}',
      });

      this.render('{{foo-bar}}');

      equalTokens(this.firstChild, expectedHtmlBold);

      runTask(() => this.rerender());

      equalTokens(this.firstChild, expectedHtmlBold);

      runTask(() => set(component, 'output', htmlSafe(expectedHtmlItalic)));

      equalTokens(this.firstChild, expectedHtmlItalic);

      runTask(() => set(component, 'output', htmlSafe(expectedHtmlBold)));

      equalTokens(this.firstChild, expectedHtmlBold);
    }

    ['@test late bound layouts return the same definition'](assert) {
      let templateIds = [];

      // This is testing the scenario where you import a template and
      // set it to the layout property:
      //
      // import Component from '@ember/component';
      // import layout from './template';
      //
      // export default Component.extend({
      //   layout
      // });
      let hello = compile('Hello');
      let bye = compile('Bye');

      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          this.layout = this.cond ? hello : bye;
          templateIds.push(this.layout.id);
        },
      });

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render(
        '{{foo-bar cond=true}}{{foo-bar cond=false}}{{foo-bar cond=true}}{{foo-bar cond=false}}'
      );

      let [t1, t2, t3, t4] = templateIds;
      assert.equal(t1, t3);
      assert.equal(t2, t4);
    }

    ['@test can use isStream property without conflict (#13271)']() {
      let component;
      let FooBarComponent = Component.extend({
        isStream: true,

        init() {
          this._super(...arguments);
          component = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,

        template: strip`
        {{#if this.isStream}}
          true
        {{else}}
          false
        {{/if}}
      `,
      });

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, { content: 'true' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'true' });

      runTask(() => set(component, 'isStream', false));

      this.assertComponentElement(this.firstChild, { content: 'false' });

      runTask(() => set(component, 'isStream', true));

      this.assertComponentElement(this.firstChild, { content: 'true' });
    }
    ['@test lookup of component takes priority over property']() {
      this.registerComponent('some-component', {
        template: 'some-component',
      });

      this.render('{{this.some-prop}} {{some-component}}', {
        'some-component': 'not-some-component',
        'some-prop': 'some-prop',
      });

      this.assertText('some-prop some-component');

      runTask(() => this.rerender());

      this.assertText('some-prop some-component');
    }

    ['@test component without dash is looked up']() {
      this.registerComponent('somecomponent', {
        template: 'somecomponent',
      });

      this.render('{{somecomponent}}', {
        somecomponent: 'notsomecomponent',
      });

      this.assertText('somecomponent');

      this.assertStableRerender();

      runTask(() => this.context.set('somecomponent', 'not not notsomecomponent'));

      this.assertText('somecomponent');

      runTask(() => this.context.set('somecomponent', 'notsomecomponent'));

      this.assertText('somecomponent');
    }

    ['@test non-block with properties access via attrs is asserted against']() {
      expectAssertion(() => {
        this.registerComponent('non-block', {
          template: 'In layout - someProp: {{attrs.someProp}}',
        });
      }, "Using {{attrs}} to reference named arguments is not supported. {{attrs.someProp}} should be updated to {{@someProp}}. ('my-app/templates/components/non-block.hbs' @ L1:C24) ");
    }

    ['@test non-block with properties on this.attrs']() {
      this.registerComponent('non-block', {
        template: 'In layout - someProp: {{this.attrs.someProp}}',
      });

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something here',
      });

      this.assertText('In layout - someProp: something here');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here');

      runTask(() => this.context.set('prop', 'other thing there'));

      this.assertText('In layout - someProp: other thing there');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here');
    }

    ['@test non-block with named argument']() {
      this.registerComponent('non-block', {
        template: 'In layout - someProp: {{@someProp}}',
      });

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something here',
      });

      this.assertText('In layout - someProp: something here');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here');

      runTask(() => this.context.set('prop', 'other thing there'));

      this.assertText('In layout - someProp: other thing there');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here');
    }

    ['@test non-block with properties overridden in init']() {
      let instance;
      this.registerComponent('non-block', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            instance = this;
            this.someProp = 'value set in instance';
          },
        }),
        template: 'In layout - someProp: {{this.someProp}}',
      });

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something passed when invoked',
      });

      this.assertText('In layout - someProp: value set in instance');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: value set in instance');

      runTask(() => this.context.set('prop', 'updated something passed when invoked'));

      this.assertText('In layout - someProp: updated something passed when invoked');

      runTask(() => instance.set('someProp', 'update value set in instance'));

      this.assertText('In layout - someProp: update value set in instance');

      runTask(() => this.context.set('prop', 'something passed when invoked'));
      runTask(() => instance.set('someProp', 'value set in instance'));

      this.assertText('In layout - someProp: value set in instance');
    }

    ['@test rerendering component with attrs from parent'](assert) {
      let willUpdateCount = 0;
      let didReceiveAttrsCount = 0;

      function expectHooks({ willUpdate, didReceiveAttrs }, callback) {
        willUpdateCount = 0;
        didReceiveAttrsCount = 0;

        callback();

        if (willUpdate) {
          assert.strictEqual(willUpdateCount, 1, 'The willUpdate hook was fired');
        } else {
          assert.strictEqual(willUpdateCount, 0, 'The willUpdate hook was not fired');
        }

        if (didReceiveAttrs) {
          assert.strictEqual(didReceiveAttrsCount, 1, 'The didReceiveAttrs hook was fired');
        } else {
          assert.strictEqual(didReceiveAttrsCount, 0, 'The didReceiveAttrs hook was not fired');
        }
      }

      this.registerComponent('non-block', {
        ComponentClass: Component.extend({
          didReceiveAttrs() {
            didReceiveAttrsCount++;
          },

          willUpdate() {
            willUpdateCount++;
          },
        }),
        template: 'In layout - someProp: {{this.someProp}}',
      });

      expectHooks({ willUpdate: false, didReceiveAttrs: true }, () => {
        this.render('{{non-block someProp=this.someProp}}', {
          someProp: 'wycats',
        });
      });

      this.assertText('In layout - someProp: wycats');

      // Note: Hooks are not fired in Glimmer for idempotent re-renders
      expectHooks({ willUpdate: false, didReceiveAttrs: false }, () => {
        runTask(() => this.rerender());
      });

      this.assertText('In layout - someProp: wycats');

      expectHooks({ willUpdate: true, didReceiveAttrs: true }, () => {
        runTask(() => this.context.set('someProp', 'tomdale'));
      });

      this.assertText('In layout - someProp: tomdale');

      // Note: Hooks are not fired in Glimmer for idempotent re-renders
      expectHooks({ willUpdate: false, didReceiveAttrs: false }, () => {
        runTask(() => this.rerender());
      });

      this.assertText('In layout - someProp: tomdale');

      expectHooks({ willUpdate: true, didReceiveAttrs: true }, () => {
        runTask(() => this.context.set('someProp', 'wycats'));
      });

      this.assertText('In layout - someProp: wycats');
    }

    ['@test setting a value for a computed property then later getting the value for that property works'](
      assert
    ) {
      let componentInstance = null;

      this.registerComponent('non-block', {
        ComponentClass: Component.extend({
          counter: computed({
            set(key, value) {
              return value;
            },
          }),

          init() {
            this._super(...arguments);
            componentInstance = this;
          },

          actions: {
            click() {
              let currentCounter = this.get('counter');

              assert.equal(currentCounter, 0, 'the current `counter` value is correct');

              let newCounter = currentCounter + 1;
              this.set('counter', newCounter);

              assert.equal(
                this.get('counter'),
                newCounter,
                "getting the newly set `counter` property works; it's equal to the value we just set and not `undefined`"
              );
            },
          },
        }),
        template: `
          <button {{action "click"}}>foobar</button>
        `,
      });

      this.render(`{{non-block counter=this.counter}}`, {
        counter: 0,
      });

      runTask(() => this.$('button').click());

      assert.equal(
        componentInstance.get('counter'),
        1,
        '`counter` incremented on click on the component and is not `undefined`'
      );
    }

    ['@test this.attrs.foo === @foo === foo']() {
      this.registerComponent('foo-bar', {
        template: strip`
        Args: {{this.attrs.value}} | {{@value}} | {{this.value}}
        {{#each this.attrs.items as |item|}}
          {{item}}
        {{/each}}
        {{#each @items as |item|}}
          {{item}}
        {{/each}}
        {{#each this.items as |item|}}
          {{item}}
        {{/each}}
      `,
      });

      this.render('{{foo-bar value=this.model.value items=this.model.items}}', {
        model: {
          value: 'wat',
          items: [1, 2, 3],
        },
      });

      this.assertStableRerender();

      runTask(() => {
        this.context.set('model.value', 'lul');
        this.context.set('model.items', [1]);
      });

      this.assertText(strip`Args: lul | lul | lul111`);

      runTask(() => this.context.set('model', { value: 'wat', items: [1, 2, 3] }));

      this.assertText('Args: wat | wat | wat123123123');
    }

    ['@test non-block with properties on self']() {
      this.registerComponent('non-block', {
        template: 'In layout - someProp: {{this.someProp}}',
      });

      this.render('{{non-block someProp=this.prop}}', {
        prop: 'something here',
      });

      this.assertText('In layout - someProp: something here');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here');

      runTask(() => this.context.set('prop', 'something else'));

      this.assertText('In layout - someProp: something else');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here');
    }

    ['@test block with properties on self']() {
      this.registerComponent('with-block', {
        template: 'In layout - someProp: {{this.someProp}} - {{yield}}',
      });

      this.render(
        strip`
      {{#with-block someProp=this.prop}}
        In template
      {{/with-block}}`,
        {
          prop: 'something here',
        }
      );

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.context.set('prop', 'something else'));

      this.assertText('In layout - someProp: something else - In template');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here - In template');
    }

    ['@test block with properties on attrs is asserted against']() {
      expectAssertion(() => {
        this.registerComponent('with-block', {
          template: 'In layout - someProp: {{attrs.someProp}} - {{yield}}',
        });
      }, "Using {{attrs}} to reference named arguments is not supported. {{attrs.someProp}} should be updated to {{@someProp}}. ('my-app/templates/components/with-block.hbs' @ L1:C24) ");
    }

    ['@test block with properties on this.attrs']() {
      this.registerComponent('with-block', {
        template: 'In layout - someProp: {{this.attrs.someProp}} - {{yield}}',
      });

      this.render(
        strip`
      {{#with-block someProp=this.prop}}
        In template
      {{/with-block}}`,
        {
          prop: 'something here',
        }
      );

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.context.set('prop', 'something else'));

      this.assertText('In layout - someProp: something else - In template');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here - In template');
    }

    ['@test block with named argument']() {
      this.registerComponent('with-block', {
        template: 'In layout - someProp: {{@someProp}} - {{yield}}',
      });

      this.render(
        strip`
      {{#with-block someProp=this.prop}}
        In template
      {{/with-block}}`,
        {
          prop: 'something here',
        }
      );

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.rerender());

      this.assertText('In layout - someProp: something here - In template');

      runTask(() => this.context.set('prop', 'something else'));

      this.assertText('In layout - someProp: something else - In template');

      runTask(() => this.context.set('prop', 'something here'));

      this.assertText('In layout - someProp: something here - In template');
    }

    ['@test static arbitrary number of positional parameters'](assert) {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'names',
        }),
        template: strip`
        {{#each this.names as |name|}}
          {{name}}
        {{/each}}`,
      });

      this.render(strip`
      {{sample-component "Foo" 4 "Bar" elementId="args-3"}}
      {{sample-component "Foo" 4 "Bar" 5 "Baz" elementId="args-5"}}`);

      assert.equal(this.$('#args-3').text(), 'Foo4Bar');
      assert.equal(this.$('#args-5').text(), 'Foo4Bar5Baz');

      runTask(() => this.rerender());

      assert.equal(this.$('#args-3').text(), 'Foo4Bar');
      assert.equal(this.$('#args-5').text(), 'Foo4Bar5Baz');
    }

    ['@test arbitrary positional parameter conflict with hash parameter is reported']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'names',
        }),
        template: strip`
        {{#each this.names as |name|}}
          {{name}}
        {{/each}}`,
      });

      expectAssertion(() => {
        this.render(`{{sample-component "Foo" 4 "Bar" names=this.numbers id="args-3"}}`, {
          numbers: [1, 2, 3],
        });
      }, 'You cannot specify positional parameters and the hash argument `names`.');
    }

    ['@test can use hash parameter instead of arbitrary positional param [GH #12444]']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'names',
        }),
        template: strip`
        {{#each this.names as |name|}}
          {{name}}
        {{/each}}`,
      });

      this.render('{{sample-component names=this.things}}', {
        things: emberA(['Foo', 4, 'Bar']),
      });

      this.assertText('Foo4Bar');

      runTask(() => this.rerender());

      this.assertText('Foo4Bar');

      runTask(() => this.context.get('things').pushObject(5));

      this.assertText('Foo4Bar5');

      runTask(() => this.context.get('things').shiftObject());

      this.assertText('4Bar5');

      runTask(() => this.context.get('things').clear());

      this.assertText('');

      runTask(() => this.context.set('things', emberA(['Foo', 4, 'Bar'])));

      this.assertText('Foo4Bar');
    }

    ['@test can use hash parameter instead of positional param'](assert) {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['first', 'second'],
        }),
        template: '{{this.first}} - {{this.second}}',
      });

      // TODO: Fix when id is implemented
      this.render(strip`
      {{sample-component "one" "two" elementId="two-positional"}}
      {{sample-component "one" second="two" elementId="one-positional"}}
      {{sample-component first="one" second="two" elementId="no-positional"}}`);

      assert.equal(this.$('#two-positional').text(), 'one - two');
      assert.equal(this.$('#one-positional').text(), 'one - two');
      assert.equal(this.$('#no-positional').text(), 'one - two');

      runTask(() => this.rerender());

      assert.equal(this.$('#two-positional').text(), 'one - two');
      assert.equal(this.$('#one-positional').text(), 'one - two');
      assert.equal(this.$('#no-positional').text(), 'one - two');
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

      this.render(`{{sample-component this.user1 this.user2}}`, {
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

    ['@test with ariaRole specified']() {
      this.registerComponent('aria-test', {
        template: 'Here!',
      });

      this.render('{{aria-test ariaRole=this.role}}', {
        role: 'main',
      });

      this.assertComponentElement(this.firstChild, { attrs: { role: 'main' } });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { attrs: { role: 'main' } });

      runTask(() => this.context.set('role', 'input'));

      this.assertComponentElement(this.firstChild, {
        attrs: { role: 'input' },
      });

      runTask(() => this.context.set('role', 'main'));

      this.assertComponentElement(this.firstChild, { attrs: { role: 'main' } });
    }

    ['@test with ariaRole defined but initially falsey GH#16379']() {
      this.registerComponent('aria-test', {
        template: 'Here!',
      });

      this.render('{{aria-test ariaRole=this.role}}', {
        role: undefined,
      });

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => this.context.set('role', 'input'));

      this.assertComponentElement(this.firstChild, {
        attrs: { role: 'input' },
      });

      runTask(() => this.context.set('role', undefined));

      this.assertComponentElement(this.firstChild, { attrs: {} });
    }

    ['@test without ariaRole defined initially']() {
      // we are using the ability to lazily add a role as a sign that we are
      // doing extra work
      let instance;
      this.registerComponent('aria-test', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            instance = this;
          },
        }),
        template: 'Here!',
      });

      this.render('{{aria-test}}');

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { attrs: {} });

      runTask(() => instance.set('ariaRole', 'input'));

      this.assertComponentElement(this.firstChild, { attrs: {} });
    }

    ['@test `template` specified in component is overridden by block']() {
      this.registerComponent('with-template', {
        ComponentClass: Component.extend({
          template: compile('Should not be used'),
        }),
        template: '[In layout - {{this.name}}] {{yield}}',
      });

      this.render(
        strip`
      {{#with-template name="with-block"}}
        [In block - {{this.name}}]
      {{/with-template}}
      {{with-template name="without-block"}}`,
        {
          name: 'Whoop, whoop!',
        }
      );

      this.assertText(
        '[In layout - with-block] [In block - Whoop, whoop!][In layout - without-block] '
      );

      runTask(() => this.rerender());

      this.assertText(
        '[In layout - with-block] [In block - Whoop, whoop!][In layout - without-block] '
      );

      runTask(() => this.context.set('name', 'Ole, ole'));

      this.assertText('[In layout - with-block] [In block - Ole, ole][In layout - without-block] ');

      runTask(() => this.context.set('name', 'Whoop, whoop!'));

      this.assertText(
        '[In layout - with-block] [In block - Whoop, whoop!][In layout - without-block] '
      );
    }

    ['@test (has-block) is true when block supplied']() {
      this.registerComponent('with-block', {
        template: strip`
        {{#if (has-block)}}
          {{yield}}
        {{else}}
          No Block!
        {{/if}}`,
      });

      this.render(strip`
      {{#with-block}}
        In template
      {{/with-block}}`);

      this.assertText('In template');

      runTask(() => this.rerender());

      this.assertText('In template');
    }

    ['@test (has-block) is false when no block supplied']() {
      this.registerComponent('with-block', {
        template: strip`
        {{#if (has-block)}}
          {{yield}}
        {{else}}
          No Block!
        {{/if}}`,
      });

      this.render('{{with-block}}');

      this.assertText('No Block!');

      runTask(() => this.rerender());

      this.assertText('No Block!');
    }

    ['@test (has-block-params) is true when block param supplied']() {
      this.registerComponent('with-block', {
        template: strip`
        {{#if (has-block-params)}}
          {{yield this}} - In Component
        {{else}}
          {{yield}} No Block!
        {{/if}}`,
      });

      this.render(strip`
      {{#with-block as |something|}}
        In template
      {{/with-block}}`);

      this.assertText('In template - In Component');

      runTask(() => this.rerender());

      this.assertText('In template - In Component');
    }

    ['@test (has-block-params) is false when no block param supplied']() {
      this.registerComponent('with-block', {
        template: strip`
        {{#if (has-block-params)}}
          {{yield this}}
        {{else}}
          {{yield}} No Block Param!
        {{/if}}`,
      });

      this.render(strip`
      {{#with-block}}
        In block
      {{/with-block}}`);

      this.assertText('In block No Block Param!');

      runTask(() => this.rerender());

      this.assertText('In block No Block Param!');
    }

    ['@test static named positional parameters']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name', 'age'],
        }),
        template: '{{this.name}}{{this.age}}',
      });

      this.render('{{sample-component "Quint" 4}}');

      this.assertText('Quint4');

      runTask(() => this.rerender());

      this.assertText('Quint4');
    }

    ['@test dynamic named positional parameters']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name', 'age'],
        }),
        template: '{{this.name}}{{this.age}}',
      });

      this.render('{{sample-component this.myName this.myAge}}', {
        myName: 'Quint',
        myAge: 4,
      });

      this.assertText('Quint4');

      runTask(() => this.rerender());

      this.assertText('Quint4');

      runTask(() => this.context.set('myName', 'Sergio'));

      this.assertText('Sergio4');

      runTask(() => this.context.set('myAge', 2));

      this.assertText('Sergio2');

      runTask(() => {
        this.context.set('myName', 'Quint');
        this.context.set('myAge', 4);
      });

      this.assertText('Quint4');
    }

    ['@test if a value is passed as a non-positional parameter, it raises an assertion']() {
      this.registerComponent('sample-component', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: ['name'],
        }),
        template: '{{this.name}}',
      });

      expectAssertion(() => {
        this.render('{{sample-component this.notMyName name=this.myName}}', {
          myName: 'Quint',
          notMyName: 'Sergio',
        });
      }, 'You cannot specify both a positional param (at position 0) and the hash argument `name`.');
    }

    ['@test yield to inverse']() {
      this.registerComponent('my-if', {
        template: strip`
        {{#if this.predicate}}
          Yes:{{yield this.someValue}}
        {{else}}
          No:{{yield to="inverse"}}
        {{/if}}`,
      });

      this.render(
        strip`
      {{#my-if predicate=this.activated someValue=42 as |result|}}
        Hello{{result}}
      {{else}}
        Goodbye
      {{/my-if}}`,
        {
          activated: true,
        }
      );

      this.assertText('Yes:Hello42');

      runTask(() => this.rerender());

      this.assertText('Yes:Hello42');

      runTask(() => this.context.set('activated', false));

      this.assertText('No:Goodbye');

      runTask(() => this.context.set('activated', true));

      this.assertText('Yes:Hello42');
    }

    ['@test expression (has-block) inverse']() {
      this.registerComponent('check-inverse', {
        template: strip`
        {{#if (has-block "inverse")}}
          Yes
        {{else}}
          No
        {{/if}}`,
      });

      this.render(strip`
      {{#check-inverse}}{{/check-inverse}}
      {{#check-inverse}}{{else}}{{/check-inverse}}`);

      this.assertComponentElement(this.firstChild, { content: 'No' });
      this.assertComponentElement(this.nthChild(1), { content: 'Yes' });

      this.assertStableRerender();
    }

    ['@test expression (has-block) default']() {
      this.registerComponent('check-block', {
        template: strip`
        {{#if (has-block)}}
          Yes
        {{else}}
          No
        {{/if}}`,
      });

      this.render(strip`
      {{check-block}}
      {{#check-block}}{{/check-block}}`);

      this.assertComponentElement(this.firstChild, { content: 'No' });
      this.assertComponentElement(this.nthChild(1), { content: 'Yes' });

      this.assertStableRerender();
    }

    ['@test expression (has-block-params) inverse']() {
      this.registerComponent('check-inverse', {
        template: strip`
        {{#if (has-block-params "inverse")}}
          Yes
        {{else}}
          No
        {{/if}}`,
      });

      this.render(strip`
      {{#check-inverse}}{{/check-inverse}}
      {{#check-inverse as |something|}}{{/check-inverse}}`);

      this.assertComponentElement(this.firstChild, { content: 'No' });
      this.assertComponentElement(this.nthChild(1), { content: 'No' });

      this.assertStableRerender();
    }

    ['@test expression (has-block-params) default']() {
      this.registerComponent('check-block', {
        template: strip`
        {{#if (has-block-params)}}
          Yes
        {{else}}
          No
        {{/if}}`,
      });

      this.render(strip`
      {{#check-block}}{{/check-block}}
      {{#check-block as |something|}}{{/check-block}}`);

      this.assertComponentElement(this.firstChild, { content: 'No' });
      this.assertComponentElement(this.nthChild(1), { content: 'Yes' });

      this.assertStableRerender();
    }

    ['@test (has-block) expression in an attribute'](assert) {
      this.registerComponent('check-attr', {
        template: '<button name={{(has-block)}}></button>',
      });

      this.render(strip`
      {{check-attr}}
      {{#check-attr}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'true' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block) inverse expression in an attribute'](assert) {
      this.registerComponent(
        'check-attr',
        {
          template: '<button name={{(has-block "inverse")}}></button>',
        },
        ''
      );

      this.render(strip`
      {{#check-attr}}{{/check-attr}}
      {{#check-attr}}{{else}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'true' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block-params) expression in an attribute'](assert) {
      this.registerComponent('check-attr', {
        template: '<button name={{(has-block-params)}}></button>',
      });

      this.render(strip`
      {{#check-attr}}{{/check-attr}}
      {{#check-attr as |something|}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'true' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block-params) inverse expression in an attribute'](assert) {
      this.registerComponent(
        'check-attr',
        {
          template: '<button name={{(has-block-params "inverse")}}></button>',
        },
        ''
      );

      this.render(strip`
      {{#check-attr}}{{/check-attr}}
      {{#check-attr as |something|}}{{/check-attr}}`);

      equalsElement(assert, this.$('button')[0], 'button', { name: 'false' }, '');
      equalsElement(assert, this.$('button')[1], 'button', { name: 'false' }, '');

      this.assertStableRerender();
    }

    ['@test (has-block) as a param to a helper']() {
      this.registerComponent('check-helper', {
        template: '{{if (has-block) "true" "false"}}',
      });

      this.render(strip`
      {{check-helper}}
      {{#check-helper}}{{/check-helper}}`);

      this.assertComponentElement(this.firstChild, { content: 'false' });
      this.assertComponentElement(this.nthChild(1), { content: 'true' });

      this.assertStableRerender();
    }

    ['@test (has-block) inverse as a param to a helper']() {
      this.registerComponent('check-helper', {
        template: '{{if (has-block "inverse") "true" "false"}}',
      });

      this.render(strip`
      {{#check-helper}}{{/check-helper}}
      {{#check-helper}}{{else}}{{/check-helper}}`);

      this.assertComponentElement(this.firstChild, { content: 'false' });
      this.assertComponentElement(this.nthChild(1), { content: 'true' });

      this.assertStableRerender();
    }

    ['@test (has-block-params) as a param to a helper']() {
      this.registerComponent('check-helper', {
        template: '{{if (has-block-params) "true" "false"}}',
      });

      this.render(strip`
      {{#check-helper}}{{/check-helper}}
      {{#check-helper as |something|}}{{/check-helper}}`);

      this.assertComponentElement(this.firstChild, { content: 'false' });
      this.assertComponentElement(this.nthChild(1), { content: 'true' });

      this.assertStableRerender();
    }

    ['@test (has-block-params) inverse as a param to a helper']() {
      this.registerComponent('check-helper', {
        template: '{{if (has-block-params "inverse") "true" "false"}}',
      });

      this.render(strip`
      {{#check-helper}}{{/check-helper}}
      {{#check-helper as |something|}}{{/check-helper}}`);

      this.assertComponentElement(this.firstChild, { content: 'false' });
      this.assertComponentElement(this.nthChild(1), { content: 'false' });

      this.assertStableRerender();
    }

    ['@test component in template of a yielding component should have the proper parentView'](
      assert
    ) {
      let outer, innerTemplate, innerLayout;

      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            outer = this;
          },
        }),
        template: '{{x-inner-in-layout}}{{yield}}',
      });

      this.registerComponent('x-inner-in-template', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            innerTemplate = this;
          },
        }),
      });

      this.registerComponent('x-inner-in-layout', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            innerLayout = this;
          },
        }),
      });

      this.render('{{#x-outer}}{{x-inner-in-template}}{{/x-outer}}');

      assert.equal(
        innerTemplate.parentView,
        outer,
        'receives the wrapping component as its parentView in template blocks'
      );
      assert.equal(
        innerLayout.parentView,
        outer,
        'receives the wrapping component as its parentView in layout'
      );
      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );

      runTask(() => this.rerender());

      assert.equal(
        innerTemplate.parentView,
        outer,
        'receives the wrapping component as its parentView in template blocks'
      );
      assert.equal(
        innerLayout.parentView,
        outer,
        'receives the wrapping component as its parentView in layout'
      );
      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );
    }

    ['@test newly-added sub-components get correct parentView'](assert) {
      let outer, inner;

      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            outer = this;
          },
        }),
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            inner = this;
          },
        }),
      });

      this.render(
        strip`
      {{#x-outer}}
        {{#if this.showInner}}
          {{x-inner}}
        {{/if}}
      {{/x-outer}}`,
        {
          showInner: false,
        }
      );

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );

      runTask(() => this.rerender());

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView (after rerender)'
      );

      runTask(() => this.context.set('showInner', true));

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );
      assert.equal(
        inner.parentView,
        outer,
        'receives the wrapping component as its parentView in template blocks'
      );

      runTask(() => this.context.set('showInner', false));

      assert.equal(
        outer.parentView,
        this.context,
        'x-outer receives the ambient scope as its parentView'
      );
    }

    ["@test when a property is changed during children's rendering"]() {
      let middle;

      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({
          value: 1,
        }),
        template: '{{#x-middle}}{{x-inner value=this.value}}{{/x-middle}}',
      });

      this.registerComponent('x-middle', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            middle = this;
          },
          value: null,
        }),
        template: '<div id="middle-value">{{this.value}}</div>{{yield}}',
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          value: null,
          didReceiveAttrs() {
            middle.set('value', this.get('value'));
          },
        }),
        template: '<div id="inner-value">{{value}}</div>',
      });

      let expectedBacktrackingMessage = backtrackingMessageFor('value', '<.+?>', {
        renderTree: ['x-outer', 'x-middle', 'this.value'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }

    ["@test when a shared dependency is changed during children's rendering"]() {
      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({
          value: 1,
          wrapper: EmberObject.create({ content: null }),
        }),
        template:
          '<div id="outer-value">{{this.wrapper.content}}</div> {{x-inner value=this.value wrapper=this.wrapper}}',
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          didReceiveAttrs() {
            this.get('wrapper').set('content', this.get('value'));
          },
          value: null,
        }),
        template: '<div id="inner-value">{{wrapper.content}}</div>',
      });

      let expectedBacktrackingMessage = backtrackingMessageFor('content', '<.+?>', {
        renderTree: ['x-outer', 'this.wrapper.content'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }

    ["@test when a shared dependency is changed during children's rendering (tracked)"]() {
      class Wrapper {
        @tracked content = null;
      }

      this.registerComponent('x-outer', {
        ComponentClass: Component.extend({
          value: 1,
          wrapper: new Wrapper(),
        }),
        template:
          '<div id="outer-value">{{this.wrapper.content}}</div> {{x-inner value=this.value wrapper=this.wrapper}}',
      });

      this.registerComponent('x-inner', {
        ComponentClass: Component.extend({
          didReceiveAttrs() {
            this.get('wrapper').content = this.get('value');
          },
          value: null,
        }),
        template: '<div id="inner-value">{{this.wrapper.content}}</div>',
      });

      let expectedBacktrackingMessage = backtrackingMessageFor('content', 'Wrapper', {
        renderTree: ['x-outer', 'this.wrapper.content'],
      });

      expectAssertion(() => {
        this.render('{{x-outer}}');
      }, expectedBacktrackingMessage);
    }

    ['@test non-block with each rendering child components']() {
      this.registerComponent('non-block', {
        template: strip`
        In layout. {{#each this.items as |item|}}
          [{{child-non-block item=item}}]
        {{/each}}`,
      });

      this.registerComponent('child-non-block', {
        template: 'Child: {{this.item}}.',
      });

      let items = emberA(['Tom', 'Dick', 'Harry']);

      this.render('{{non-block items=this.items}}', { items });

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

      runTask(() => this.rerender());

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');

      runTask(() => this.context.get('items').pushObject('Sergio'));

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.][Child: Sergio.]');

      runTask(() => this.context.get('items').shiftObject());

      this.assertText('In layout. [Child: Dick.][Child: Harry.][Child: Sergio.]');

      runTask(() => this.context.set('items', emberA(['Tom', 'Dick', 'Harry'])));

      this.assertText('In layout. [Child: Tom.][Child: Dick.][Child: Harry.]');
    }

    ['@test specifying classNames results in correct class'](assert) {
      this.registerComponent('some-clicky-thing', {
        ComponentClass: Component.extend({
          tagName: 'button',
          classNames: ['foo', 'bar'],
        }),
      });

      this.render(strip`
      {{#some-clicky-thing classNames="baz"}}
        Click Me
      {{/some-clicky-thing}}`);

      // TODO: ember-view is no longer viewable in the classNames array. Bug or
      // feature?
      let expectedClassNames = ['ember-view', 'foo', 'bar', 'baz'];

      assert.ok(
        this.$('button').is('.foo.bar.baz.ember-view'),
        `the element has the correct classes: ${this.$('button').attr('class')}`
      );
      // `ember-view` is no longer in classNames.
      // assert.deepEqual(clickyThing.get('classNames'), expectedClassNames, 'classNames are properly combined');
      this.assertComponentElement(this.firstChild, {
        tagName: 'button',
        attrs: { class: classes(expectedClassNames.join(' ')) },
      });

      runTask(() => this.rerender());

      assert.ok(
        this.$('button').is('.foo.bar.baz.ember-view'),
        `the element has the correct classes: ${this.$('button').attr('class')} (rerender)`
      );
      // `ember-view` is no longer in classNames.
      // assert.deepEqual(clickyThing.get('classNames'), expectedClassNames, 'classNames are properly combined (rerender)');
      this.assertComponentElement(this.firstChild, {
        tagName: 'button',
        attrs: { class: classes(expectedClassNames.join(' ')) },
      });
    }

    ['@test specifying custom concatenatedProperties avoids clobbering']() {
      this.registerComponent('some-clicky-thing', {
        ComponentClass: Component.extend({
          concatenatedProperties: ['blahzz'],
          blahzz: ['blark', 'pory'],
        }),
        template: strip`
        {{#each this.blahzz as |p|}}
          {{p}}
        {{/each}}
        - {{yield}}`,
      });

      this.render(strip`
      {{#some-clicky-thing blahzz="baz"}}
        Click Me
      {{/some-clicky-thing}}`);

      this.assertText('blarkporybaz- Click Me');

      runTask(() => this.rerender());

      this.assertText('blarkporybaz- Click Me');
    }

    ['@test a two way binding flows upstream when consumed in the template']() {
      let component;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,

        template: '{{this.bar}}',
      });

      this.render('{{this.localBar}} - {{foo-bar bar=this.localBar}}', {
        localBar: 'initial value',
      });

      this.assertText('initial value - initial value');

      runTask(() => this.rerender());

      this.assertText('initial value - initial value');

      runTask(() => {
        component.set('bar', 'updated value');
      });

      this.assertText('updated value - updated value');

      runTask(() => {
        component.set('bar', undefined);
      });

      this.assertText(' - ');

      runTask(() => {
        this.component.set('localBar', 'initial value');
      });

      this.assertText('initial value - initial value');
    }

    ['@test a two way binding flows upstream through a CP when consumed in the template']() {
      let component;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        },

        bar: computed({
          get() {
            return this._bar;
          },

          set(key, value) {
            this._bar = value;
            return this._bar;
          },
        }),
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,

        template: '{{this.bar}}',
      });

      this.render('{{this.localBar}} - {{foo-bar bar=this.localBar}}', {
        localBar: 'initial value',
      });

      this.assertText('initial value - initial value');

      runTask(() => this.rerender());

      this.assertText('initial value - initial value');

      runTask(() => {
        component.set('bar', 'updated value');
      });

      this.assertText('updated value - updated value');

      runTask(() => {
        this.component.set('localBar', 'initial value');
      });

      this.assertText('initial value - initial value');
    }

    ['@test a two way binding flows upstream through a CP without template consumption']() {
      let component;
      let FooBarComponent = Component.extend({
        init() {
          this._super(...arguments);
          component = this;
        },

        bar: computed({
          get() {
            return this._bar;
          },

          set(key, value) {
            this._bar = value;
            return this._bar;
          },
        }),
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: '',
      });

      this.render('{{this.localBar}}{{foo-bar bar=this.localBar}}', {
        localBar: 'initial value',
      });

      this.assertText('initial value');

      runTask(() => this.rerender());

      this.assertText('initial value');

      runTask(() => {
        component.set('bar', 'updated value');
      });

      this.assertText('updated value');

      runTask(() => {
        this.component.set('localBar', 'initial value');
      });

      this.assertText('initial value');
    }

    ['@test GH#18417 - a two way binding flows upstream to a parent component through a CP']() {
      let parent, child;
      let ParentComponent = Component.extend({
        init() {
          this._super(...arguments);
          parent = this;
        },
        string: 'Hello|World',
      });

      this.registerComponent('parent', {
        ComponentClass: ParentComponent,
        template: `{{child value=this.string}}

        Parent String=<span data-test-parent-value>{{this.string}}</span>`,
      });

      let ChildComponent = Component.extend({
        init() {
          this._super(...arguments);
          child = this;
        },

        a: null, // computed based on passed in value of `string`
        b: null, // computed based on passed in value of `string`

        value: computed('a', 'b', {
          get() {
            return this.a + '|' + this.b;
          },

          set(key, value) {
            let vals = value.split('|');
            set(this, 'a', vals[0]);
            set(this, 'b', vals[1]);
            return value;
          },
        }),
      });

      this.registerComponent('child', {
        ComponentClass: ChildComponent,
        template: '{{this.value}}',
      });

      this.render('{{parent}}');

      this.assert.equal(parent.string, 'Hello|World', 'precond - parent value');
      this.assert.equal(
        this.element.querySelector('[data-test-parent-value]').textContent.trim(),
        'Hello|World',
        'precond - parent rendered value'
      );

      runTask(() => {
        child.set('a', 'Foo');
      });

      this.assert.equal(parent.string, 'Foo|World', 'parent value updated');

      this.assert.equal(
        this.element.querySelector('[data-test-parent-value]').textContent.trim(),
        'Foo|World',
        'parent updated value rendered'
      );

      runTask(() => {
        child.set('a', 'Hello');
      });

      this.assert.equal(parent.string, 'Hello|World', 'parent value reset');
      this.assert.equal(
        this.element.querySelector('[data-test-parent-value]').textContent.trim(),
        'Hello|World',
        'parent template reset'
      );
    }

    ['@test services can be injected into components']() {
      let serviceInstance;
      this.registerService(
        'name',
        Service.extend({
          init() {
            this._super(...arguments);
            serviceInstance = this;
          },
          last: 'Jackson',
        })
      );

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          name: service(),
        }),
        template: '{{this.name.last}}',
      });

      this.render('{{foo-bar}}');

      this.assertText('Jackson');

      runTask(() => this.rerender());

      this.assertText('Jackson');

      runTask(() => {
        serviceInstance.set('last', 'McGuffey');
      });

      this.assertText('McGuffey');

      runTask(() => {
        serviceInstance.set('last', 'Jackson');
      });

      this.assertText('Jackson');
    }

    ['@test injecting an unknown service raises an exception']() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          missingService: service(),
        }),
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, "Attempting to inject an unknown injection: 'service:missingService'");
    }

    ['@test throws if `this._super` is not called from `init`']() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          init() {},
        }),
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /You must call `super.init\(...arguments\);` or `this._super\(...arguments\)` when overriding `init` on a framework object. Please update .*/);
    }

    ['@test it can use readDOMAttr to read input value']() {
      let component;
      let assertElement = (expectedValue) => {
        // value is a property, not an attribute
        this.assertHTML(`<input class="ember-view" id="${component.elementId}">`);
        this.assert.equal(this.firstChild.value, expectedValue, 'value property is correct');
        this.assert.equal(
          get(component, 'value'),
          expectedValue,
          'component.get("value") is correct'
        );
      };

      this.registerComponent('one-way-input', {
        ComponentClass: Component.extend({
          tagName: 'input',
          attributeBindings: ['value'],

          init() {
            this._super(...arguments);
            component = this;
          },

          change() {
            let value = this.readDOMAttr('value');
            this.set('value', value);
          },
        }),
      });

      this.render('{{one-way-input value=this.value}}', {
        value: 'foo',
      });

      assertElement('foo');

      this.assertStableRerender();

      runTask(() => {
        this.firstChild.value = 'bar';
        this.$('input').trigger('change');
      });

      assertElement('bar');

      runTask(() => {
        this.firstChild.value = 'foo';
        this.$('input').trigger('change');
      });

      assertElement('foo');

      runTask(() => {
        set(component, 'value', 'bar');
      });

      assertElement('bar');

      runTask(() => {
        this.firstChild.value = 'foo';
        this.$('input').trigger('change');
      });

      assertElement('foo');
    }

    ['@test child triggers revalidate during parent destruction (GH#13846)']() {
      this.registerComponent('x-select', {
        ComponentClass: Component.extend({
          tagName: 'select',

          init() {
            this._super();
            this.options = emberA([]);
            this.value = null;
          },

          updateValue() {
            let newValue = this.get('options.lastObject.value');

            this.set('value', newValue);
          },

          registerOption(option) {
            this.get('options').addObject(option);
          },

          unregisterOption(option) {
            this.get('options').removeObject(option);

            this.updateValue();
          },
        }),

        template: '{{yield this}}',
      });

      this.registerComponent('x-option', {
        ComponentClass: Component.extend({
          tagName: 'option',
          attributeBindings: ['selected'],

          didInsertElement() {
            this._super(...arguments);

            this.get('select').registerOption(this);
          },

          selected: computed('select.value', function () {
            return this.get('value') === this.get('select.value');
          }),

          willDestroyElement() {
            this._super(...arguments);
            this.get('select').unregisterOption(this);
          },
        }),
      });

      this.render(strip`
      {{#x-select value=this.value as |select|}}
        {{#x-option value="1" select=select}}1{{/x-option}}
        {{#x-option value="2" select=select}}2{{/x-option}}
      {{/x-select}}
    `);

      this.teardown();

      this.assert.ok(true, 'no errors during teardown');
    }

    ['@test setting a property in willDestroyElement does not assert (GH#14273)'](assert) {
      assert.expect(2);

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.showFoo = true;
          },

          willDestroyElement() {
            this.set('showFoo', false);
            assert.ok(true, 'willDestroyElement was fired');
            this._super(...arguments);
          },
        }),

        template: `{{#if this.showFoo}}things{{/if}}`,
      });

      this.render(`{{foo-bar}}`);

      this.assertText('things');
    }

    async ['@test didReceiveAttrs fires after .init() but before observers become active'](assert) {
      let barCopyDidChangeCount = 0;

      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);
            this.didInit = true;
          },

          didReceiveAttrs() {
            assert.ok(this.didInit, 'expected init to have run before didReceiveAttrs');
            this.set('barCopy', this.attrs.bar.value + 1);
          },

          barCopyDidChange: observer('barCopy', () => {
            barCopyDidChangeCount++;
          }),
        }),

        template: '{{this.bar}}-{{this.barCopy}}',
      });

      await this.render(`{{foo-bar bar=this.bar}}`, { bar: 3 });

      this.assertText('3-4');

      assert.strictEqual(barCopyDidChangeCount, 1, 'expected observer firing for: barCopy');

      set(this.context, 'bar', 7);

      await runLoopSettled();

      this.assertText('7-8');

      assert.strictEqual(barCopyDidChangeCount, 2, 'expected observer firing for: barCopy');
    }

    ['@test overriding didReceiveAttrs does not trigger deprecation'](assert) {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          didReceiveAttrs() {
            assert.equal(1, this.get('foo'), 'expected attrs to have correct value');
          },
        }),

        template: '{{this.foo}}-{{this.fooCopy}}-{{this.bar}}-{{this.barCopy}}',
      });

      this.render(`{{foo-bar foo=this.foo bar=this.bar}}`, { foo: 1, bar: 3 });
    }

    ['@test overriding didUpdateAttrs does not trigger deprecation'](assert) {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          didUpdateAttrs() {
            assert.equal(5, this.get('foo'), 'expected newAttrs to have new value');
          },
        }),

        template: '{{this.foo}}-{{this.fooCopy}}-{{this.bar}}-{{this.barCopy}}',
      });

      this.render(`{{foo-bar foo=this.foo bar=this.bar}}`, { foo: 1, bar: 3 });

      runTask(() => set(this.context, 'foo', 5));
    }

    ['@test returning `true` from an action does not bubble if `target` is not specified (GH#14275)'](
      assert
    ) {
      this.registerComponent('display-toggle', {
        ComponentClass: Component.extend({
          actions: {
            show() {
              assert.ok(true, 'display-toggle show action was called');
              return true;
            },
          },
        }),

        template: `<button {{action 'show'}}>Show</button>`,
      });

      this.render(`{{display-toggle}}`, {
        send() {
          assert.notOk(true, 'send should not be called when action is not "subscribed" to');
        },
      });

      this.assertText('Show');

      runTask(() => this.$('button').click());
    }

    ['@test returning `true` from an action bubbles to the `target` if specified'](assert) {
      assert.expect(4);

      this.registerComponent('display-toggle', {
        ComponentClass: Component.extend({
          actions: {
            show() {
              assert.ok(true, 'display-toggle show action was called');
              return true;
            },
          },
        }),

        template: `<button {{action 'show'}}>Show</button>`,
      });

      this.render(`{{display-toggle target=this}}`, {
        send(actionName) {
          assert.ok(true, 'send should be called when action is "subscribed" to');
          assert.equal(actionName, 'show');
        },
      });

      this.assertText('Show');

      runTask(() => this.$('button').click());
    }

    ['@test triggering an event only attempts to invoke an identically named method, if it actually is a function (GH#15228)'](
      assert
    ) {
      assert.expect(3);

      let payload = ['arbitrary', 'event', 'data'];

      this.registerComponent('evented-component', {
        ComponentClass: Component.extend({
          someTruthyProperty: true,

          init() {
            this._super(...arguments);
            this.trigger('someMethod', ...payload);
            this.trigger('someTruthyProperty', ...payload);
          },

          someMethod(...data) {
            assert.deepEqual(
              data,
              payload,
              'the method `someMethod` should be called, when `someMethod` is triggered'
            );
          },

          listenerForSomeMethod: on('someMethod', function (...data) {
            assert.deepEqual(
              data,
              payload,
              'the listener `listenerForSomeMethod` should be called, when `someMethod` is triggered'
            );
          }),

          listenerForSomeTruthyProperty: on('someTruthyProperty', function (...data) {
            assert.deepEqual(
              data,
              payload,
              'the listener `listenerForSomeTruthyProperty` should be called, when `someTruthyProperty` is triggered'
            );
          }),
        }),
      });

      this.render(`{{evented-component}}`);
    }

    ['@test component yielding in an {{#each}} has correct block values after rerendering (GH#14284)']() {
      this.registerComponent('list-items', {
        template: `{{#each this.items as |item|}}{{yield item}}{{/each}}`,
      });

      this.render(
        strip`
      {{#list-items items=this.items as |thing|}}
        |{{thing}}|

        {{#if this.editMode}}
          Remove {{thing}}
        {{/if}}
      {{/list-items}}
    `,
        {
          editMode: false,
          items: ['foo', 'bar', 'qux', 'baz'],
        }
      );

      this.assertText('|foo||bar||qux||baz|');

      this.assertStableRerender();

      runTask(() => set(this.context, 'editMode', true));

      this.assertText('|foo|Remove foo|bar|Remove bar|qux|Remove qux|baz|Remove baz');

      runTask(() => set(this.context, 'editMode', false));

      this.assertText('|foo||bar||qux||baz|');
    }

    ['@test unimplimented positionalParams do not cause an error GH#14416']() {
      this.registerComponent('foo-bar', {
        template: 'hello',
      });

      this.render('{{foo-bar this.wat}}');
      this.assertText('hello');
    }

    ['@test using attrs for positional params is asserted against']() {
      let MyComponent = Component.extend();

      expectAssertion(() => {
        this.registerComponent('foo-bar', {
          ComponentClass: MyComponent.reopenClass({
            positionalParams: ['myVar'],
          }),
          template:
            'MyVar1: {{attrs.myVar}} {{this.myVar}} MyVar2: {{this.myVar2}} {{attrs.myVar2}}',
        });
      }, "Using {{attrs}} to reference named arguments is not supported. {{attrs.myVar}} should be updated to {{@myVar}}. ('my-app/templates/components/foo-bar.hbs' @ L1:C10) ");
    }

    ['@test using this.attrs for positional params']() {
      let MyComponent = Component.extend();

      this.registerComponent('foo-bar', {
        ComponentClass: MyComponent.reopenClass({
          positionalParams: ['myVar'],
        }),
        template:
          'MyVar1: {{this.attrs.myVar}} {{this.myVar}} MyVar2: {{this.myVar2}} {{this.attrs.myVar2}}',
      });

      this.render('{{foo-bar 1 myVar2=2}}');

      this.assertText('MyVar1: 1 1 MyVar2: 2 2');
    }

    ['@test using named arguments for positional params']() {
      let MyComponent = Component.extend();

      this.registerComponent('foo-bar', {
        ComponentClass: MyComponent.reopenClass({
          positionalParams: ['myVar'],
        }),
        template: 'MyVar1: {{@myVar}} {{this.myVar}} MyVar2: {{this.myVar2}} {{@myVar2}}',
      });

      this.render('{{foo-bar 1 myVar2=2}}');

      this.assertText('MyVar1: 1 1 MyVar2: 2 2');
    }

    ["@test can use `{{this}}` to emit the component's toString value [GH#14581]"]() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          toString() {
            return 'special sauce goes here!';
          },
        }),
        template: '{{this}}',
      });

      this.render('{{foo-bar}}');

      this.assertText('special sauce goes here!');
    }

    ['@test can use `{{this` to access paths on current context [GH#14581]']() {
      let instance;
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          init() {
            this._super(...arguments);

            instance = this;
          },

          foo: {
            bar: {
              baz: 'huzzah!',
            },
          },
        }),
        template: '{{this.foo.bar.baz}}',
      });

      this.render('{{foo-bar}}');

      this.assertText('huzzah!');

      this.assertStableRerender();

      runTask(() => set(instance, 'foo.bar.baz', 'yippie!'));

      this.assertText('yippie!');

      runTask(() => set(instance, 'foo.bar.baz', 'huzzah!'));

      this.assertText('huzzah!');
    }

    ['@test can use custom element in component layout']() {
      this.registerComponent('foo-bar', {
        template: '<blah-zorz>Hi!</blah-zorz>',
      });

      this.render('{{foo-bar}}');

      this.assertText('Hi!');
    }

    ['@test can use nested custom element in component layout']() {
      this.registerComponent('foo-bar', {
        template: '<blah-zorz><hows-it-going>Hi!</hows-it-going></blah-zorz>',
      });

      this.render('{{foo-bar}}');

      this.assertText('Hi!');
    }

    ['@test can access properties off of rest style positionalParams array']() {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend().reopenClass({
          positionalParams: 'things',
        }),
        template: `{{@things.length}}`,
      });

      this.render('{{foo-bar "foo" "bar" "baz"}}');

      this.assertText('3');
    }

    ['@test has attrs by didReceiveAttrs with native classes'](assert) {
      class FooBarComponent extends Component {
        constructor(injections) {
          super(injections);
          // analogous to class field defaults
          this.foo = 'bar';
        }

        didReceiveAttrs() {
          assert.equal(this.foo, 'bar', 'received default attrs correctly');
        }
      }

      this.registerComponent('foo-bar', { ComponentClass: FooBarComponent });

      this.render('{{foo-bar}}');
    }

    ['@test ensure aliases are watched properly [GH#17243]']() {
      let fooInstance, barInstance;

      let FooComponent = Component.extend({
        source: 'first',
        foo: alias('source'),

        init() {
          this._super(...arguments);
          fooInstance = this;
        },
      });

      this.registerComponent('foo', {
        ComponentClass: FooComponent,
        template: '{{this.foo}}',
      });

      let BarComponent = Component.extend({
        target: null,

        init() {
          this._super(...arguments);
          barInstance = this;
        },

        bar: computed('target.foo', function () {
          if (this.target) {
            return this.target.foo.toUpperCase();
          }
        }),
      });

      this.registerComponent('bar', {
        ComponentClass: BarComponent,
        template: '{{this.bar}}',
      });

      this.render('[<Foo />][<Bar />]');

      this.assertText('[first][]');

      // addObserver
      runTask(() => set(barInstance, 'target', fooInstance));

      this.assertText('[first][FIRST]');

      runTask(() => set(fooInstance, 'source', 'second'));

      this.assertText('[second][SECOND]');

      // removeObserver
      runTask(() => set(barInstance, 'target', null));

      this.assertText('[second][]');

      runTask(() => set(fooInstance, 'source', 'third'));

      this.assertText('[third][]');
    }

    ['@test it can render a basic component in native ES class syntax'](assert) {
      let testContext = this;
      this.registerComponent('foo-bar', {
        ComponentClass: class extends Component {
          constructor(owner) {
            super(owner);

            assert.equal(owner, testContext.owner, 'owner was passed as a constructor argument');
          }
        },
        template: 'hello',
      });

      this.render('{{foo-bar}}');

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'hello' });
    }

    ['@test can use `{{@component.foo}}` in a template GH#19313']() {
      this.registerComponent('foo-bar', {
        template: '{{@component.foo}}',
      });

      this.render('{{foo-bar component=(hash foo="bar")}}');

      this.assertComponentElement(this.firstChild, { content: 'bar' });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, { content: 'bar' });
    }

    '@test lifecycle hooks are not tracked'() {
      this.registerComponent('foo-bar', {
        ComponentClass: class extends Component {
          @tracked foo;

          willInsertElement() {
            this.foo;
            this.foo = 123;
          }

          willRender() {
            this.foo;
            this.foo = 123;
          }

          didRender() {
            this.foo;
            this.foo = 123;
          }

          didReceiveAttrs() {
            this.foo;
            this.foo = 123;
          }

          didUpdate() {
            this.foo;
            this.foo = 123;
          }

          didUpdateAttrs() {
            this.foo;
            this.foo = 123;
          }

          didInsertElement() {
            this.foo;
            this.foo = 123;
          }

          willClearRender() {
            this.foo;
            this.foo = 123;
          }

          willDestroyElement() {
            this.foo;
            this.foo = 123;
          }

          didDestroyElement() {
            this.foo;
            this.foo = 123;
          }
        },
        template: '{{this.baz}}',
      });

      this.render('{{#if this.cond}}{{foo-bar baz=this.value}}{{/if}}', {
        cond: true,
        value: 'hello',
      });

      this.assertComponentElement(this.firstChild, { content: 'hello' });

      runTask(() => set(this.context, 'value', 'world'));

      this.assertComponentElement(this.firstChild, { content: 'world' });

      runTask(() => set(this.context, 'cond', false));
    }

    '@test tracked property mutation in init does not error'() {
      // TODO: this should issue a deprecation, but since the curly manager
      // uses an untracked frame for construction we don't (yet)
      this.registerComponent('foo-bar', {
        template: `{{this.itemCount}}`,
        ComponentClass: class extends Component {
          @tracked itemCount = 0;

          init() {
            super.init(...arguments);

            // first read the tracked property
            let { itemCount } = this;

            // then attempt to update the tracked property
            this.itemCount = itemCount + 1;
          }
        },
      });

      this.render('<FooBar />');

      this.assertComponentElement(this.firstChild, { content: '1' });
    }

    '@test `{{#let blah as |foo|}}` does not affect `<Foo />` resolution'() {
      this.registerComponent('foo', {
        ComponentClass: null,
        template: 'foo component',
      });

      this.render('{{#let "foo block param" as |foo|}}<Foo />{{/let}}');

      this.assertText('foo component');

      runTask(() => this.rerender());

      this.assertText('foo component');
    }
  }
);
