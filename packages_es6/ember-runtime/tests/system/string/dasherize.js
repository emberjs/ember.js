import Ember from "ember-metal/core";
import EmberStringUtils from "ember-runtime/system/string";

module('EmberStringUtils.dasherize');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  test("String.prototype.dasherize is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.dasherize, 'String.prototype helper disabled');
  });
}

test("dasherize normal string", function() {
  deepEqual(EmberStringUtils.dasherize('my favorite items'), 'my-favorite-items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.dasherize(), 'my-favorite-items');
  }
});

test("does nothing with dasherized string", function() {
  deepEqual(EmberStringUtils.dasherize('css-class-name'), 'css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.dasherize(), 'css-class-name');
  }
});

test("dasherize underscored string", function() {
  deepEqual(EmberStringUtils.dasherize('action_name'), 'action-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.dasherize(), 'action-name');
  }
});

test("dasherize camelcased string", function() {
  deepEqual(EmberStringUtils.dasherize('innerHTML'), 'inner-html');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.dasherize(), 'inner-html');
  }
});

test("dasherize string that is the property name of Object.prototype", function() {
  deepEqual(EmberStringUtils.dasherize('toString'), 'to-string');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('toString'.dasherize(), 'to-string');
  }
});

test("after call with the same passed value take object from cache", function() {
  var res = EmberStringUtils.dasherize('innerHTML');

  var callCount = 0;
  var decamelize = EmberStringUtils.decamelize;

  try {
    EmberStringUtils.decamelize = function() {
      callCount++;
    };
    EmberStringUtils.dasherize('innerHTML');
  } finally {
    EmberStringUtils.decamelize = decamelize;
  }

  equal(callCount, 0, "decamelize is not called again");
});
