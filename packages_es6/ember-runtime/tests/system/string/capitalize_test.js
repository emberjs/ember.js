import Ember from "ember-metal/core";
import {capitalize} from "ember-runtime/system/string";

module('EmberStringUtils.capitalize');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.capitalize is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.capitalize, 'String.prototype helper disabled');
  });
}

test("capitalize normal string", function() {
  deepEqual(capitalize('my favorite items'), 'My favorite items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.capitalize(), 'My favorite items');
  }
});

test("capitalize dasherized string", function() {
  deepEqual(capitalize('css-class-name'), 'Css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.capitalize(), 'Css-class-name');
  }
});

test("capitalize underscored string", function() {
  deepEqual(capitalize('action_name'), 'Action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.capitalize(), 'Action_name');
  }
});

test("capitalize camelcased string", function() {
  deepEqual(capitalize('innerHTML'), 'InnerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.capitalize(), 'InnerHTML');
  }
});

test("does nothing with capitalized string", function() {
  deepEqual(capitalize('Capitalized string'), 'Capitalized string');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('Capitalized string'.capitalize(), 'Capitalized string');
  }
});
