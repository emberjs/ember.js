import EmberObject from 'ember-runtime/system/object';
import {Freezable} from 'ember-runtime/mixins/freezable';

QUnit.module('Ember.Freezable');

QUnit.test('should be deprecated', function() {
  expectDeprecation('`Ember.Freezable` is deprecated, use `Object.freeze` instead.');
  EmberObject.extend(Freezable).create();
});
