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

  equal( Ember.isArray(numarray), true,  "[1,2,3]" );
  equal( Ember.isArray(number),   false, "23" );
  equal( Ember.isArray(strarray), true,  '["Hello", "Hi"]' );
  equal( Ember.isArray(string),   false, '"Hello"' );
  equal( Ember.isArray(object),   false, "{}" );
  equal( Ember.isArray(length),   true,  "{length: 12}" );
  equal( Ember.isArray(global),   false, "global" );
  equal( Ember.isArray(fn),       false, "function() {}" );
});
