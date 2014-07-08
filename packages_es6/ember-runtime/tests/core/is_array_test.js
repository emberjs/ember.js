import Ember from "ember-metal/core";
import {isArray} from "ember-metal/utils";
import ArrayProxy from "ember-runtime/system/array_proxy";

module("Ember Type Checking");

test("Ember.isArray" ,function() {
  var arrayProxy = ArrayProxy.create({ content: Ember.A() });

  equal(isArray(arrayProxy), true, "[]");
});
