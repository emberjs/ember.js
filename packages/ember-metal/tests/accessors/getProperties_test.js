module('Ember.getProperties');

test('can retrieve a hash of properties from an object via an argument list or array of property names', function() {
  var obj = {
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  };

  var getProperties = Ember.getProperties;
  deepEqual(getProperties(obj, "firstName", "lastName"), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, "firstName", "lastName"), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, "lastName"), { lastName: 'Jobs' });
  deepEqual(getProperties(obj), {});
  deepEqual(getProperties(obj, ["firstName", "lastName"]), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, ["firstName"]), { firstName: 'Steve' });
  deepEqual(getProperties(obj, []), {});
});
