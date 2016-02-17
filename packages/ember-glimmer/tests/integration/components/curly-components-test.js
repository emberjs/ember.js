import { set } from 'ember-metal/property_set';
import Component from 'ember-views/components/component';
import { moduleFor, RenderingTest } from '../../utils/test-case';

moduleFor('Components test: curly components', class extends RenderingTest {

  ['@test it can render a basic component']() {
    this.registerComponent('foo-bar', { template: 'hello' });

    this.render('{{foo-bar}}');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@test it has an element']() {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        instance = this;
        this._super();
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    let element1 = instance.element;

    this.assertComponentElement(element1, { content: 'hello' });

    this.runTask(() => this.rerender());

    let element2 = instance.element;

    this.assertComponentElement(element2, { content: 'hello' });

    this.assertSameNode(element2, element1);
  }

  ['@htmlbars it has a jQuery proxy to the element'](assert) {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        instance = this;
        this._super();
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    let element1 = instance.$()[0];

    this.assertComponentElement(element1, { content: 'hello' });

    this.runTask(() => this.rerender());

    let element2 = instance.$()[0];

    this.assertComponentElement(element2, { content: 'hello' });

    this.assertSameNode(element2, element1);
  }

  ['@htmlbars it scopes the jQuery proxy to the component element'](assert) {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        instance = this;
        this._super();
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '<span class="inner">inner</span>' });

    this.render('<span class="outer">outer</span>{{foo-bar}}');

    let $span = instance.$('span');

    assert.equal($span.length, 1);
    assert.equal($span.attr('class'), 'inner');

    this.runTask(() => this.rerender());

    $span = instance.$('span');

    assert.equal($span.length, 1);
    assert.equal($span.attr('class'), 'inner');
  }

  ['@test it can render a basic component with a block']() {
    this.registerComponent('foo-bar', { template: '{{yield}}' });

    this.render('{{#foo-bar}}hello{{/foo-bar}}');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

  ['@test it renders the layout with the component instance as the context']() {
    let instance;

    let FooBarComponent = Component.extend({
      init() {
        instance = this;
        this._super();
        this.set('message', 'hello');
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: '{{message}}' });

    this.render('{{foo-bar}}');

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

    this.render('{{#foo-bar}}{{message}}{{/foo-bar}}', { message: 'hello' });

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => this.rerender());

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => set(this.context, 'message', 'goodbye'));

    this.assertComponentElement(this.firstChild, { content: 'goodbye' });

    this.runTask(() => set(this.context, 'message', 'hello'));

    this.assertComponentElement(this.firstChild, { content: 'hello' });
  }

});
