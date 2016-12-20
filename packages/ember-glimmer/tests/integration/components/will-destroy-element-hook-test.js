import { set } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { tryInvoke } from 'ember-utils';
import { runAppend } from 'internal-test-helpers';

moduleFor('Component willDestroyElement hook', class extends RenderingTest {
  ['@test it calls willDestroyElement when removed by if'](assert) {
    let didInsertElementCount = 0;
    let willDestroyElementCount = 0;
    let FooBarComponent = Component.extend({
      didInsertElement() {
        didInsertElementCount++;
        assert.notEqual(this.element.parentNode, null, 'precond component is in DOM');
      },
      willDestroyElement() {
        willDestroyElementCount++;
        assert.notEqual(this.element.parentNode, null, 'has not been removed from DOM yet');
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{#if switch}}{{foo-bar}}{{/if}}', { switch: true });

    assert.equal(didInsertElementCount, 1, 'didInsertElement was called once');

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => set(this.context, 'switch', false));

    assert.equal(willDestroyElementCount, 1, 'willDestroyElement was called once');

    this.assertText('');
  }
  ['@test still has access to this.$()'](assert) {
    assert.expect(2);
    let component;
    let FooBarComponent = Component.extend({
      tagName: 'div',
      didInsertElement() {
        component = this;
      },
      willDestroyElement() {
        assert.ok(this.$(), 'willDestroyElement has access to element via this.$()');
      },
      didDestroyElement() {
        assert.notOk(this.$(), 'didDestroyElement does not have access to element via this.$()');
      }
    });
    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });
    let { owner } = this;
    let comp = owner.lookup('component:foo-bar');
    runAppend(comp);
    this.runTask(() => tryInvoke(component, 'destroy'));
  }
});
