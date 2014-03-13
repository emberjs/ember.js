import Ember from "ember-metal/core";
import {camelize} from "ember-runtime/system/string";

module('EmberStringUtils.camelize');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.camelize is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.camelize, 'String.prototype helper disabled');
  });
}

test("camelize normal string", function() {
  deepEqual(camelize('my favorite items'), 'myFavoriteItems');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.camelize(), 'myFavoriteItems');
  }
});

test("camelize capitalized string", function() {
  deepEqual(camelize('I Love Ramen'), 'iLoveRamen');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('I Love Ramen'.camelize(), 'iLoveRamen');
  }
});

test("camelize dasherized string", function() {
  deepEqual(camelize('css-class-name'), 'cssClassName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.camelize(), 'cssClassName');
  }
});

test("camelize underscored string", function() {
  deepEqual(camelize('action_name'), 'actionName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.camelize(), 'actionName');
  }
});

test("camelize dot notation string", function() {
  deepEqual(camelize('action.name'), 'actionName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action.name'.camelize(), 'actionName');
  }
});

test("does nothing with camelcased string", function() {
  deepEqual(camelize('innerHTML'), 'innerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.camelize(), 'innerHTML');
  }
});
