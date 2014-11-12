import getProperties from "ember-metal/get_properties";

QUnit.module('Ember.getProperties');

test('can retrieve a hash of properties from an object via an argument list or array of property names', function() {
  var obj = {
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  };

  deepEqual(getProperties(obj, "firstName", "lastName"), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, "firstName", "lastName"), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, "lastName"), { lastName: 'Jobs' });
  deepEqual(getProperties(obj), {});
  deepEqual(getProperties(obj, ["firstName", "lastName"]), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, ["firstName"]), { firstName: 'Steve' });
  deepEqual(getProperties(obj, []), {});
});

if (Ember.FEATURES.isEnabled("ember-metal-get-properties-rename-keys")) {
  test('can transform property names in returned object', function() {
    expect(4);

    var obj = {
      firstName: "Steve",
      lastName: "Jobs"
    };

    deepEqual(getProperties(obj, "firstName:first", "lastName:last"), { first: 'Steve', last: 'Jobs' });
    deepEqual(getProperties(obj, ":"), {});

    obj['application:main'] = 'app';
    deepEqual(getProperties(obj, "application:main"), { 'application:main': 'app' });
    deepEqual(getProperties(obj, "application:main:application"), { 'application': 'app' });
  });
}
