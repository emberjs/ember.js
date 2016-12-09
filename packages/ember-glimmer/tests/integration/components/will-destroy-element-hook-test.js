import { set } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { moduleFor, RenderingTest } from '../../utils/test-case';

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
});
