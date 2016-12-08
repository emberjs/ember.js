import getProperties from '../../get_properties';

QUnit.module('Ember.getProperties');

QUnit.test('can retrieve a hash of properties from an object via an argument list or array of property names', function() {
  let obj = {
    firstName: 'Steve',
    lastName: 'Jobs',
    companyName: 'Apple, Inc.'
  };

  deepEqual(getProperties(obj, 'firstName', 'lastName'), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, 'firstName', 'lastName'), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, 'lastName'), { lastName: 'Jobs' });
  deepEqual(getProperties(obj), {});
  deepEqual(getProperties(obj, ['firstName', 'lastName']), { firstName: 'Steve', lastName: 'Jobs' });
  deepEqual(getProperties(obj, ['firstName']), { firstName: 'Steve' });
  deepEqual(getProperties(obj, []), {});
});
