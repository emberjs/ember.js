import { set } from 'ember-metal';
import { Component } from '../../utils/helpers';
import { moduleFor, RenderingTest } from '../../utils/test-case';

moduleFor('Component destroy', class extends RenderingTest {
  ['@test it correctly releases the destroyed components'](assert) {
    let FooBarComponent = Component.extend({});

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{#if switch}}{{#foo-bar}}{{foo-bar}}{{/foo-bar}}{{/if}}', { switch: true });

    this.assertComponentElement(this.firstChild, { content: 'hello' });

    this.runTask(() => set(this.context, 'switch', false));

    this.assertText('');

    assert.equal(this.env.destroyedComponents.length, 0, 'environment.destroyedComponents should be empty');
  }
});
