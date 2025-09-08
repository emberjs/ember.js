import { AbstractTestCase, expectDeprecation } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class MapByTests extends AbstractTestCase {
  '@test get value of each property'() {
    let obj = this.newObject([{ a: 1 }, { a: 2 }]);
    expectDeprecation(() => {
      this.assert.equal(obj.mapBy('a').join(''), '12');
    }, /Usage of Ember.Array methods is deprecated/);
  }

  '@test should work also through getEach alias'() {
    let obj = this.newObject([{ a: 1 }, { a: 2 }]);
    expectDeprecation(() => {
      this.assert.equal(obj.getEach('a').join(''), '12');
    }, /Usage of Ember.Array methods is deprecated/);
  }
}

runArrayTests('mapBy', MapByTests);
