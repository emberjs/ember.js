import { RenderingTest, moduleFor } from '../utils/test-case';
import { Component } from '../utils/helpers';
import { set, Binding } from 'ember-metal';

moduleFor('Binding integration tests', class extends RenderingTest {
  ['@test should accept bindings as a string or an Ember.binding']() {
    let FooBarComponent = Component.extend({
      twoWayTestBinding: Binding.from('direction'),
      stringTestBinding: 'direction',
      twoWayObjectTestBinding: Binding.from('displacement.distance'),
      stringObjectTestBinding: 'displacement.distance'
    });

    this.registerComponent('foo-bar', {
      ComponentClass: FooBarComponent,
      template: 'two way: {{twoWayTest}}, string: {{stringTest}}, object: {{twoWayObjectTest}}, string object: {{stringObjectTest}}'
    });

    expectDeprecation(() => {
      this.render('{{foo-bar direction=direction displacement=displacement}}', {
        direction: 'down',
        displacement: {
          distance: 10
        }
      });
    }, /`Ember\.Binding` is deprecated/);

    this.assertText('two way: down, string: down, object: 10, string object: 10');

    this.assertStableRerender();

    this.runTask(() => set(this.context, 'direction',  'up'));

    this.assertText('two way: up, string: up, object: 10, string object: 10');

    this.runTask(() => set(this.context, 'displacement.distance', 20));

    this.assertText('two way: up, string: up, object: 20, string object: 20');

    this.runTask(() => {
      set(this.context, 'direction', 'right');
      set(this.context, 'displacement.distance', 30);
    });

    this.assertText('two way: right, string: right, object: 30, string object: 30');

    this.runTask(() => {
      set(this.context, 'direction', 'down');
      set(this.context, 'displacement', { distance: 10 });
    });

    this.assertText('two way: down, string: down, object: 10, string object: 10');
  }
});
