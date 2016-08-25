import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';

moduleFor('Components test: appendTo', class extends RenderingTest {
  ['@htmlbars calling appendTo should append multiple roots']() {
    this.$().html('<div id="first"></div><div id="second"></div>');

    this.registerComponent('x-first', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-first'
      }),

      template: 'x-first!'
    });

    this.registerComponent('x-second', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-second'
      }),

      template: 'x-second!'
    });

    let First = this.owner._lookupFactory('component:x-first');
    let Second = this.owner._lookupFactory('component:x-second');

    this.first = First.create();
    this.second = Second.create();


    this.assert.ok(!this.first.element, 'precond - should not have an element');
    this.assert.ok(!this.second.element, 'precond - should not have an element');

    this.runTask(() => this.first.appendTo('#first'));
    this.runTask(() => this.second.appendTo('#second'));

    this.assertComponentElement(this.element.querySelector('#first').firstChild, { content: 'x-first!' });
    this.assertComponentElement(this.element.querySelector('#second').firstChild, { content: 'x-second!' });
  }

  ['@test calling appendTo should append to the specified element']() {
    this.$().html('<div id="menu"></div>');

    this.registerComponent('x-parent', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-parent'
      }),

      template: '{{#x-child}}x-parent block content{{/x-child}}'
    });

    this.registerComponent('x-child', {
      template: '|{{yield}}|'
    });

    let XParent = this.owner._lookupFactory('component:x-parent');
    this.component = XParent.create();

    this.assert.ok(!this.component.element, 'precond - should not have an element');

    this.runTask(() => this.component.appendTo('#menu'));

    this.assertComponentElement(this.firstChild.firstChild, {});
    this.assertComponentElement(this.component.element.children[0], { content: '|x-parent block content|' });
  }

  ['@test should append to the document.body when calling append()']() {
    this.registerComponent('x-parent', {
      ComponentClass: Component.extend({
        layoutName: 'components/x-parent'
      }),

      template: '{{#x-child}}x-parent block content{{/x-child}}'
    });

    this.registerComponent('x-child', {
      template: '|{{yield}}|'
    });

    let XParent = this.owner._lookupFactory('component:x-parent');
    this.component = XParent.create();

    this.assert.ok(!this.component.element, 'precond - should not have an element');

    this.runTask(() => this.component.append());

    this.assertComponentElement(document.body.lastChild, {});
    this.assertComponentElement(this.component.element.children[0], { content: '|x-parent block content|' });
  }

  ['@test raises an assertion when the target does not exist in the DOM']() {
    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        layoutName: 'components/foo-bar'
      }),
      template: 'FOO BAR!'
    });

    let FooBar = this.owner._lookupFactory('component:foo-bar');
    this.component = FooBar.create();

    this.assert.ok(!this.component.element, 'precond - should not have an element');

    this.runTask(() => {
      expectAssertion(() => {
        this.component.appendTo('#does-not-exist-in-dom');
      }, /You tried to append to \(#does-not-exist-in-dom\) but that isn't in the DOM/);
    });
  }

  ['@test destroying removes a component that was appended with appendTo'](assert) {
    let willDestroyCalled = 0;

    this.registerComponent('foo-bar', {
      ComponentClass: Component.extend({
        layoutName: 'components/foo-bar',
        willDestroyElement() {
          willDestroyCalled++;
        }
      }),
      template: 'FOO BAR!'
    });

    let FooBar = this.owner._lookupFactory('component:foo-bar');
    this.component = FooBar.create();

    this.assert.ok(!this.component.element, 'precond - should not have an element');

    this.runTask(() => this.component.appendTo(this.element));

    this.assertComponentElement(this.firstChild,  { content: 'FOO BAR!' });

    this.runTask(() => this.component.destroy());

    if (this.isGlimmer) {
      this.assertHTML('');
    } else {
      this.assertHTML('<!---->');
    }

    this.assert.equal(willDestroyCalled, 1);
  }
});
