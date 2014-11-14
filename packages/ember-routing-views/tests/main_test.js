import "ember-routing-views";
import Ember from 'ember-metal/core';

QUnit.module("ember-routing-views");

test("exports correctly", function() {
  ok(Ember.LinkView, "LinkView is exported correctly");
  ok(Ember.OutletView, "OutletView is exported correctly");
});
