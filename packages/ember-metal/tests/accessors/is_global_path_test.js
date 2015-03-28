import { isGlobalPath } from "ember-metal/binding";

QUnit.module('Ember.isGlobalPath');

QUnit.test("global path's are recognized", function() {
  ok(isGlobalPath('App.myProperty'));
  ok(isGlobalPath('App.myProperty.subProperty'));
});

QUnit.test("if there is a 'this' in the path, it's not a global path", function() {
  ok(!isGlobalPath('this.myProperty'));
  ok(!isGlobalPath('this'));
});

QUnit.test("if the path starts with a lowercase character, it is not a global path", function() {
  ok(!isGlobalPath('myObj'));
  ok(!isGlobalPath('myObj.SecondProperty'));
});
