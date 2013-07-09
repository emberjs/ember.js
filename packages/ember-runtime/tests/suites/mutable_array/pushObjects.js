require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('pushObjects');

suite.test("should raise exception if not Ember.Enumerable is passed to pushObjects", function() {
  var obj = this.newObject([]);

  raises(function() {
    obj.pushObjects( "string" );
  });
});

suite.test("should return self immediately without error if nothing is passed to pushObjects", function() {
  var mutable = Ember.Object.extend(Ember.MutableArray, {
    content: [1,2,4]
  });

  var obj = mutable.create();

  var a = obj.pushObjects();
  var b = obj.pushObjects(void(0));
  var c = obj.pushObjects(null);

  equal(a, obj, 'pushObjects remains chainable when nothing passed');
  equal(b, obj, 'pushObjects remains chainable when undefined passed');
  equal(c, obj, 'pushObjects remains chainable when null passed');

  deepEqual(obj.get('content'), [1,2,4], 'content un-altered when nothing passed to pushObjects');

});
