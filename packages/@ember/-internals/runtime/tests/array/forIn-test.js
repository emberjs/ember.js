import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class ForInTests extends AbstractTestCase {
  '@test for in should iterate over list without "_super" #19289'() {
    let objects = [
      {
        key: 'val',
      },
      {
        key: 'val',
      },
    ];
    let keys = [];

    for (let i in objects) {
      keys.push(i);
      objects[i]['CUSTOM_PROPERTY'] = true;
    }

    this.assert.equal(
      keys.toString(),
      [0, 1].toString(),
      'there is no _super key in enumerable list'
    );
  }
}

runArrayTests('forIn', ForInTests);
