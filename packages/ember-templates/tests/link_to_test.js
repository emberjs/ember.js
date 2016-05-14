import Ember from 'ember-templates';

QUnit.module('ember-templates exports');

QUnit.test('exports correctly', function() {
  ok(Ember.LinkComponent, 'LinkComponent is exported correctly');
});

QUnit.test('`LinkComponent#currentWhen` is deprecated in favour of `current-when` (DEPRECATED)', function() {
  expectDeprecation(/Usage of `currentWhen` is deprecated, use `current-when` instead/);
  var link = Ember.LinkComponent.create();
  link.get('currentWhen');
});
