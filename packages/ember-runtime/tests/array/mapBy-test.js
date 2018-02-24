import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class MapByTests extends AbstractTestCase {
  '@test get value of each property'() {
    let obj = this.newObject([{ a: 1 }, { a: 2 }]);
    this.assert.equal(obj.mapBy('a').join(''), '12');
  }

  '@test should work also through getEach alias'() {
    let obj = this.newObject([{ a: 1 }, { a: 2 }]);
    this.assert.equal(obj.getEach('a').join(''), '12');
  }
}

runArrayTests('mapBy', MapByTests);
