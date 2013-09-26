if (Ember.FEATURES.isEnabled("em-o")) {
  module('Ember.O');
    
  test("wraps a native object", function() {
    var o = Ember.O({ohai: 'there'});
    ok(o instanceof Ember.Object, 'is an Ember.Object instance');
    equal(o.get('ohai'), 'there', 'property was assigned');
  });
    
  test("wraps null", function() {
    var o = Ember.O(null);
    ok(o instanceof Ember.Object, 'is an Ember.Object instance');
  });
    
  test("wraps undefined", function() {
    var o = Ember.O();
    ok(o instanceof Ember.Object, 'is an Ember.Object instance');
  });
    
  test("returns same Ember.Object", function() {
    var o1 = Ember.Object.create({ohai: 'there'});
    var o2 = Ember.O(o1);
    strictEqual(o1, o2, 'are the same objects');
  });
}