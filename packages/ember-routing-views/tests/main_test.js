import Ember from 'ember-routing-views';

QUnit.module('ember-routing-views');

QUnit.test('exports correctly', function() {
  ok(Ember.LinkComponent, 'LinkComponent is exported correctly');
  ok(Ember.OutletView, 'OutletView is exported correctly');
});
