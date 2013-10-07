module("Ember.generateGuid");

test("Prefix", function() {
  var a = {};
  
  ok( Ember.generateGuid(a, 'tyrell').indexOf('tyrell') > -1, "guid can be prefixed" );
});
