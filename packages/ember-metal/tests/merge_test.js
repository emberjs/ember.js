import merge from 'ember-metal/merge';
import isEnabled from 'ember-metal/features';

QUnit.module('Ember.merge');

if (isEnabled('ember-metal-ember-assign')) {
  QUnit.test('Ember.merge should be deprecated', function() {
    expectDeprecation(function() {
      merge({ a: 1 }, { b: 2 });
    }, 'Usage of `Ember.merge` is deprecated, use `Ember.assign` instead.');
  });
}
