import { getProperties } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('Ember.getProperties', class extends AbstractTestCase {
  ['@test can retrieve a hash of properties from an object via an argument list or array of property names'](assert) {
    let obj = {
      firstName: 'Steve',
      lastName: 'Jobs',
      companyName: 'Apple, Inc.'
    };

    assert.deepEqual(getProperties(obj, 'firstName', 'lastName'), { firstName: 'Steve', lastName: 'Jobs' });
    assert.deepEqual(getProperties(obj, 'firstName', 'lastName'), { firstName: 'Steve', lastName: 'Jobs' });
    assert.deepEqual(getProperties(obj, 'lastName'), { lastName: 'Jobs' });
    assert.deepEqual(getProperties(obj), {});
    assert.deepEqual(getProperties(obj, ['firstName', 'lastName']), { firstName: 'Steve', lastName: 'Jobs' });
    assert.deepEqual(getProperties(obj, ['firstName']), { firstName: 'Steve' });
    assert.deepEqual(getProperties(obj, []), {});
  }
});

