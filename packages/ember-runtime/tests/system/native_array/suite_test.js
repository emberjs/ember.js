Ember.MutableArrayTests.extend({

  name: 'Native Array',

  newObject: function(ary) {
    return Ember.A(ary ? ary.slice() : this.newFixture(3));
  },

  mutate: function(obj) {
    obj.pushObject(obj.length+1);
  },

  toArray: function(obj) {
    return obj.slice(); // make a copy.
  }

}).run();

if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Array) {
  test("Calling a overrided method not change the enumerable properties", function() {
    var array = [],
      hasOwnProperties = [];

    array.objectAt(0);

    for(var key in array) {
      if (!array.hasOwnProperty(key)) { continue; }
      hasOwnProperties.push(key);
    }

    deepEqual(hasOwnProperties, [], 'Array hasOwnProperties must be empty');
  });
}
