import { set } from 'ember-metal/property_set';
import { Component } from '../../utils/helpers';
import { strip } from '../../utils/abstract-test-case';
import { moduleFor, RenderingTest } from '../../utils/test-case';

moduleFor('Components test: dynamic components', class extends RenderingTest {

  ['@test it can render a basic component with a static argument']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    this.render('{{component "foo-bar"}}');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@test it can render a basic component with a dynamic argument']() {
    this.registerComponent('foo-bar', { template: 'hello from foo-bar' });
    this.registerComponent('foo-bar-baz', { template: 'hello from foo-bar-baz' });

    this.render('{{component componentName}}', { componentName: 'foo-bar' });

    this.assertComponentElement(this.firstChild, { content: 'hello from foo-bar' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello from foo-bar' });

    this.runTask(() => set(this.context, 'componentName', 'foo-bar-baz'));

    this.assertComponentElement(this.firstChild, { content: 'hello from foo-bar-baz' });

    this.runTask(() => set(this.context, 'componentName', 'foo-bar'));

    this.assertComponentElement(this.firstChild, { content: 'hello from foo-bar' });
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

});
