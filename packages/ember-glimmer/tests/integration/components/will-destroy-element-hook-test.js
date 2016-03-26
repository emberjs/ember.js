import { set } from 'ember-metal/property_set';
import Component from 'ember-views/components/component';
import { moduleFor, RenderingTest } from '../../utils/test-case';

moduleFor('Component willDestroyElement hook', class extends RenderingTest {
  ['@htmlbars it calls willDestroyElement when removed by if'](assert) {
    let willDestroyElementCount = 0;
    let FooBarComponent = Component.extend({
      didInsertElement() {
        assert.notEqual(this.element.parentNode, null, 'precond component is in DOM');
      },
      willDestroyElement() {
        willDestroyElementCount++;
        assert.notEqual(this.element.parentNode, null, 'has not been removed from DOM yet');
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{#if switch}}{{foo-bar}}{{/if}}', { switch: true });

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => set(this.context, 'switch', false));

    assert.equal(willDestroyElementCount, 1, 'willDestroyElement was called once');

    this.assertText('');
  }
});
