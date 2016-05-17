import { Mixin } from 'ember-metal/mixin';
import EmberObject from 'ember-runtime/system/object';
import { moduleFor, RenderingTest } from '../../utils/test-case';
import { Component } from '../../utils/helpers';

moduleFor('Component action handling', class extends RenderingTest {
  ['@test Action can be handled by a function on actions object'](assert) {
    assert.expect(1);
    let component;
    let FooBarComponent = Component.extend({
      init() {
        this._super(...arguments);
        component = this;
      },
      actions: {
        poke() {
          assert.ok(true, 'poked');
        }
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    component.send('poke');
  }

  ['@test Action can be handled by a superclass\' actions object'](assert) {
    assert.expect(4);
    let component;
    let SuperComponent = Component.extend({
      actions: {
        foo() {
          assert.ok(true, 'foo');
        },
        bar(msg) {
          assert.equal(msg, 'HELLO');
        }
      }
    });

    let SomeMixin = Mixin.create({
      actions: {
        bar(msg) {
          assert.equal(msg, 'HELLO');
          this._super(msg);
        }
      }
    });

    let FooBarComponent = SuperComponent.extend(SomeMixin, {
      init() {
        this._super(...arguments);
        component = this;
      },

      actions: {
        baz() {
          ok(true, 'baz');
        }
      }
    });

    this.registerComponent('foo-bar', { ComponentClass: FooBarComponent, template: 'hello' });

    this.render('{{foo-bar}}');

    component.send('foo');
    component.send('bar', 'HELLO');
    component.send('baz');
  }

  ['@test Actions cannot be provided at create time']() {
    let component;
    expectAssertion(() => {
      component = Component.create({
        actions: {
          foo() {}
        }
      });
    });

    // but should be OK on an object that doesn't mix in Ember.ActionHandler
    EmberObject.create({
      actions: ['foo']
    });
  }
});
