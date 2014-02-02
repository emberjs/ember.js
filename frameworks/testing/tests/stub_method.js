module('CoreQuery.stubMethod');

test('returns a set value when the stubbed method is called', function() {
  var object = {method: function() {}};
  var value = 'something';
  CoreTest.stubMethod(object, 'method').andReturn(value);

  equals(object.method(), value, 'returns a set value when the stubbed method is called');
});
