import Ember from "ember-metal/core";
import {classify} from "ember-runtime/system/string";

QUnit.module('EmberStringUtils.classify');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test("String.prototype.classify is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.classify, 'String.prototype helper disabled');
  });
}

QUnit.test("classify normal string", function() {
  deepEqual(classify('my favorite items'), 'MyFavoriteItems');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.classify(), 'MyFavoriteItems');
  }
});

QUnit.test("classify dasherized string", function() {
  deepEqual(classify('css-class-name'), 'CssClassName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.classify(), 'CssClassName');
  }
});

QUnit.test("classify underscored string", function() {
  deepEqual(classify('action_name'), 'ActionName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.classify(), 'ActionName');
  }
});

QUnit.test("does nothing with classified string", function() {
  deepEqual(classify('InnerHTML'), 'InnerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('InnerHTML'.classify(), 'InnerHTML');
  }
});
