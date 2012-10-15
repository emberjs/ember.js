module("Ember Type Checking");

var global = this;

test("Ember.isEmptyObject" ,function(){
  var emptyObj      = {},
      notEmptyObj   = {name: "Hal", spaceship: "Leonov"};
      
  equal( Ember.isEmptyObject(emptyObj), true,  "{}" );
  equal( Ember.isEmptyObject(notEmptyObj), false, "{name: 'Hal', spaceship: 'Leonov'}" );
});