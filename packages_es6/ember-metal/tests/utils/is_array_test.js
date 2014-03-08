import {isArray} from 'ember-metal/utils';
module("Ember Type Checking");

var global = this;

test("Ember.isArray" ,function() {
  var numarray      = [1,2,3],
      number        = 23,
      strarray      = ["Hello", "Hi"],
      string        = "Hello",
      object         = {},
      length        = {length: 12},
      fn            = function() {};

  equal( isArray(numarray), true,  "[1,2,3]" );
  equal( isArray(number),   false, "23" );
  equal( isArray(strarray), true,  '["Hello", "Hi"]' );
  equal( isArray(string),   false, '"Hello"' );
  equal( isArray(object),   false, "{}" );
  equal( isArray(length),   true,  "{length: 12}" );
  equal( isArray(global),   false, "global" );
  equal( isArray(fn),       false, "function() {}" );
});
