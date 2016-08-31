import { set } from 'ember-metal/property_set';
import jQuery from 'ember-views/system/jquery';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';

class AbstractAppendTest extends RenderingTest {

  constructor() {
    super();

    this.components = [];
    this.ids = [];
  }

  teardown() {
    this.component = null;

    this.components.forEach(component => {
      this.runTask(() => component.destroy());
    });

    this.ids.forEach(id => {
      let $element = jQuery(id).remove();
      this.assert.strictEqual($element.length, 0, `Should not leak element: #${id}`);
    });

    super();
  }

  /* abstract append(component): Element; */

  didAppend(component) {
    this.components.push(component);
    this.ids.push(component.elementId);
  }

  ['@test appending, updating and destroying a single component'](assert) {
    let willDestroyCalled = 0;

    this.registerComponent('x-parent', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-parent',

        willDestroyElement() {
          willDestroyCalled++;
        }
      }),

      template: '[parent: {{foo}}]{{#x-child bar=foo}}[yielded: {{foo}}]{{/x-child}}'
    });

    this.registerComponent('x-child', {
      ComponentClass: Component.extend({
        tagName: ''
      }),

      template: '[child: {{bar}}]{{yield}}'
    });

    let XParent = this.owner._lookupFactory('component:x-parent');

    this.component = XParent.create({ foo: 'zomg' });

    assert.ok(!this.component.element, 'precond - should not have an element');

    this.element = this.append(this.component);

    let componentElement = this.component.element;

    this.assertComponentElement(componentElement, { content: '[parent: zomg][child: zomg][yielded: zomg]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => this.rerender());

    this.assertComponentElement(componentElement, { content: '[parent: zomg][child: zomg][yielded: zomg]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => set(this.component, 'foo', 'wow'));

    this.assertComponentElement(componentElement, { content: '[parent: wow][child: wow][yielded: wow]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => set(this.component, 'foo', 'zomg'));

    this.assertComponentElement(componentElement, { content: '[parent: zomg][child: zomg][yielded: zomg]' });

    assert.equal(componentElement.parentElement, this.element, 'It should be attached to the target');

    this.runTask(() => this.component.destroy());

    if (this.isHTMLBars) {
      // Bug in Glimmer – component should not have .element at this point
      assert.ok(!this.component.element, 'It should not have an element');
    }

    assert.ok(!componentElement.parentElement, 'The component element should be detached');

    this.assert.equal(willDestroyCalled, 1);
  }

  ['@skip appending, updating and destroying multiple components'](assert) {
    let willDestroyCalled = 0;

    this.registerComponent('x-first', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-first',

        willDestroyElement() {
          willDestroyCalled++;
        }
      }),

      template: 'x-first {{foo}}!'
    });

    this.registerComponent('x-second', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-second',

        willDestroyElement() {
          willDestroyCalled++;
        }
      }),

      template: 'x-second {{bar}}!'
    });

    let First = this.owner._lookupFactory('component:x-first');
    let Second = this.owner._lookupFactory('component:x-second');

    let first = First.create({ foo: 'foo' });
    let second = Second.create({ bar: 'bar' });

    this.assert.ok(!first.element, 'precond - should not have an element');
    this.assert.ok(!second.element, 'precond - should not have an element');

    let wrapper1, wrapper2;

    this.runTask(() => wrapper1 = this.append(first));
    this.runTask(() => wrapper2 = this.append(second));

    let componentElement1 = first.element;
    let componentElement2 = second.element;

    this.assertComponentElement(componentElement1, { content: 'x-first foo!' });
    this.assertComponentElement(componentElement2, { content: 'x-second bar!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => set(first, 'foo', 'FOO'));

    this.assertComponentElement(componentElement1, { content: 'x-first FOO!' });
    this.assertComponentElement(componentElement2, { content: 'x-second bar!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => set(second, 'bar', 'BAR'));

    this.assertComponentElement(componentElement1, { content: 'x-first FOO!' });
    this.assertComponentElement(componentElement2, { content: 'x-second BAR!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => {
      set(first, 'foo', 'foo');
      set(second, 'bar', 'bar');
    });

    this.assertComponentElement(componentElement1, { content: 'x-first foo!' });
    this.assertComponentElement(componentElement2, { content: 'x-second bar!' });

    assert.equal(componentElement1.parentElement, wrapper1, 'The first component should be attached to the target');
    assert.equal(componentElement2.parentElement, wrapper2, 'The second component should be attached to the target');

    this.runTask(() => {
      first.destroy();
      second.destroy();
    });

    if (this.isHTMLBars) {
      // Bug in Glimmer – component should not have .element at this point
      assert.ok(!first.element, 'The first component should not have an element');
      assert.ok(!second.element, 'The second component should not have an element');
    }

    assert.ok(!componentElement1.parentElement, 'The first component element should be detached');
    assert.ok(!componentElement2.parentElement, 'The second component element should be detached');

    this.assert.equal(willDestroyCalled, 2);
  }

}

moduleFor('append: no arguments (attaching to document.body)', class extends AbstractAppendTest {

  append(component) {
    this.runTask(() => component.append());
    this.didAppend(component);
    return document.body;
  }

});

moduleFor('appendTo: a selector', class extends AbstractAppendTest {

  append(component) {
    this.runTask(() => component.appendTo('#qunit-fixture'));
    this.didAppend(component);
    return jQuery('#qunit-fixture')[0];
  }

  ['@test raises an assertion when the target does not exist in the DOM'](assert) {
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        layoutName: 'components/foo-bar'
      }),
      template: 'FOO BAR!'
    });

    let FooBar = this.owner._lookupFactory('component:foo-bar');

    this.component = FooBar.create();

    assert.ok(!this.component.element, 'precond - should not have an element');

    this.runTask(() => {
      expectAssertion(() => {
        this.component.appendTo('#does-not-exist-in-dom');
      }, /You tried to append to \(#does-not-exist-in-dom\) but that isn't in the DOM/);
    });

    assert.ok(!this.component.element, 'component should not have an element');
  }

});

moduleFor('appendTo: an element', class extends AbstractAppendTest {

  append(component) {
    let element = jQuery('#qunit-fixture')[0];
    this.runTask(() => component.appendTo(element));
    this.didAppend(component);
    return element;
  }

});

moduleFor('renderToElement: no arguments (defaults to a body context)', class extends AbstractAppendTest {

  append(component) {
    let wrapper;

    this.runTask(() => wrapper = component.renderToElement());
    this.didAppend(component);

    this.assert.equal(wrapper.tagName, 'BODY', 'wrapper is a body element');
    this.assert.notEqual(wrapper, document.body, 'wrapper is not document.body');
    this.assert.ok(!wrapper.parentNode, 'wrapper is detached');

    return wrapper;
  }

});

moduleFor('renderToElement: a div', class extends AbstractAppendTest {

  append(component) {
    let wrapper;

    this.runTask(() => wrapper = component.renderToElement('div'));
    this.didAppend(component);

    this.assert.equal(wrapper.tagName, 'DIV', 'wrapper is a body element');
    this.assert.ok(!wrapper.parentNode, 'wrapper is detached');

    return wrapper;
  }

});
