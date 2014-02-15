module('Ember.defineProperty');

test('toString', function() {

  var obj = {};
  Ember.defineProperty(obj, 'toString', undefined, function() { return 'FOO'; });
  equal(obj.toString(), 'FOO', 'should replace toString');
});

test("for data properties, didDefineProperty hook should be called if implemented", function() {
  expect(2);

  var obj = {
    didDefineProperty: function(obj, keyName, value) {
      equal(keyName, 'foo', "key name should be foo");
      equal(value, 'bar', "value should be bar");
    }
  };

  Ember.defineProperty(obj, 'foo', undefined, "bar");
});

test("for descriptor properties, didDefineProperty hook should be called if implemented", function() {
  expect(2);

  var computedProperty = Ember.computed(Ember.K);

  var obj = {
    didDefineProperty: function(obj, keyName, value) {
      equal(keyName, 'foo', "key name should be foo");
      strictEqual(value, computedProperty, "value should be passed descriptor");
    }
  };

  Ember.defineProperty(obj, 'foo', computedProperty);
});

