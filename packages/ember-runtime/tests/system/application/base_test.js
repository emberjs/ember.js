import Namespace from 'ember-runtime/system/namespace';
import Application from 'ember-runtime/system/application';

QUnit.module('Ember.Application');

QUnit.test('Ember.Application should be a subclass of Ember.Namespace', function() {

  ok(Namespace.detect(Application), 'Ember.Application subclass of Ember.Namespace');
});
