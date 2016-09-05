import EmberObject from '../../system/object';
import { Freezable } from '../../mixins/freezable';

QUnit.module('Ember.Freezable');

QUnit.test('should be deprecated', function() {
  expectDeprecation('`Ember.Freezable` is deprecated, use `Object.freeze` instead.');
  EmberObject.extend(Freezable).create();
});
