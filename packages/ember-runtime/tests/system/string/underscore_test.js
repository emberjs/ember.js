import Ember from "ember-metal/core";
import {underscore} from "ember-runtime/system/string";

QUnit.module('EmberStringUtils.underscore');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test("String.prototype.underscore is not available without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.underscore, 'String.prototype helper disabled');
  });
}

QUnit.test("with normal string", function() {
  deepEqual(underscore('my favorite items'), 'my_favorite_items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.underscore(), 'my_favorite_items');
  }
});

QUnit.test("with dasherized string", function() {
  deepEqual(underscore('css-class-name'), 'css_class_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.underscore(), 'css_class_name');
  }
});

QUnit.test("does nothing with underscored string", function() {
  deepEqual(underscore('action_name'), 'action_name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.underscore(), 'action_name');
  }
});

QUnit.test("with camelcased string", function() {
  deepEqual(underscore('innerHTML'), 'inner_html');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.underscore(), 'inner_html');
  }
});
