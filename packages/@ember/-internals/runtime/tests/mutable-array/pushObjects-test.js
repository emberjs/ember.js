import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests, newFixture } from '../helpers/array';
import ArrayProxy from '../../lib/system/array_proxy';
import { get } from '@ember/-internals/metal';

class PushObjectsTests extends AbstractTestCase {
  '@test should raise exception if not Ember.Enumerable is passed to pushObjects'() {
    let obj = this.newObject([]);

    expectAssertion(() => obj.pushObjects('string'));
  }

  '@test pushObjects should accept an array'() {
    let ary = newFixture(2);
    let obj = this.newObject([]);

    obj.pushObjects(ary);
    this.assert.equal(get(obj, 'length'), 2, 'length');
  }

  '@test pushObjects should accept an ArrayProxy'() {
    let proxy = ArrayProxy.create({ content: newFixture(2) });
    let obj = this.newObject([]);

    obj.pushObjects(proxy);
    this.assert.equal(get(obj, 'length'), 2, 'length');
  }
}

runArrayTests('pushObjects', PushObjectsTests, 'MutableArray', 'NativeArray', 'ArrayProxy');
