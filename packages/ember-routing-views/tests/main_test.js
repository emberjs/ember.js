import Ember from 'ember-routing-views';

QUnit.module("ember-routing-views");

QUnit.test("exports correctly", function() {
  ok(Ember.LinkComponent, "LinkComponent is exported correctly");
  ok(Ember.OutletView, "OutletView is exported correctly");
});

QUnit.test("Ember.LinkView throws a deprecation warning when instantiated", function() {
  expectDeprecation(/Ember.LinkView is deprecated. Please use Ember.LinkComponent/);
  Ember.LinkView.create();
});

QUnit.test("Ember.LinkView throws a deprecation warning when reopened", function() {
  expectDeprecation(/Ember.LinkView is deprecated. Please use Ember.LinkComponent/);
  Ember.LinkView.reopen({});
});
