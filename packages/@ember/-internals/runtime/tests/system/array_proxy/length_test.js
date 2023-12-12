import ArrayProxy from '@ember/array/proxy';
import EmberObject, { observer } from '@ember/object';
import { oneWay as reads, not } from '@ember/object/computed';
import { A as a } from '@ember/array';
import { moduleFor, AbstractTestCase, runTask, runLoopSettled } from 'internal-test-helpers';
import { set, get } from '@ember/object';
import { createCache, getValue } from '@glimmer/validator';

moduleFor(
  'Ember.ArrayProxy - content change (length)',
  class extends AbstractTestCase {
    ['@test should update length for null content'](assert) {
      let proxy = ArrayProxy.create({
        content: a([1, 2, 3]),
      });

      assert.equal(proxy.get('length'), 3, 'precond - length is 3');

      proxy.set('content', null);

      assert.equal(proxy.get('length'), 0, 'length updates');
    }

    ['@test should update length for null content when there is a computed property watching length'](
      assert
    ) {
      let proxy = ArrayProxy.extend({
        isEmpty: not('length'),
      }).create({
        content: a([1, 2, 3]),
      });

      assert.equal(proxy.get('length'), 3, 'precond - length is 3');

      // Consume computed property that depends on length
      proxy.get('isEmpty');

      // update content
      proxy.set('content', null);

      assert.equal(proxy.get('length'), 0, 'length updates');
    }

    ['@test getting length does not recompute the object cache'](assert) {
      let indexes = [];

      let proxy = ArrayProxy.extend({
        objectAtContent(index) {
          indexes.push(index);
          return this.content[index];
        },
      }).create({
        content: a([1, 2, 3, 4, 5]),
      });

      assert.equal(get(proxy, 'length'), 5);
      assert.deepEqual(indexes, []);

      indexes.length = 0;
      proxy.set('content', a([6, 7, 8]));
      assert.equal(get(proxy, 'length'), 3);
      assert.deepEqual(indexes, []);

      indexes.length = 0;
      proxy.content.replace(1, 0, [1, 2, 3]);
      assert.equal(get(proxy, 'length'), 6);
      assert.deepEqual(indexes, []);
    }

    '@test accessing length after content set to null'(assert) {
      let obj = ArrayProxy.create({ content: ['foo', 'bar'] });

      assert.equal(obj.length, 2, 'precond');

      set(obj, 'content', null);

      assert.equal(obj.length, 0, 'length is 0 without content');
      assert.deepEqual(obj.content, null, 'content was updated');
    }

    '@test accessing length after content set to null in willDestroy'(assert) {
      let obj = ArrayProxy.extend({
        willDestroy() {
          this.set('content', null);
          this._super(...arguments);
        },
      }).create({
        content: ['foo', 'bar'],
      });

      assert.equal(obj.length, 2, 'precond');

      runTask(() => obj.destroy());

      assert.equal(obj.length, 0, 'length is 0 without content');
      assert.deepEqual(obj.content, null, 'content was updated');
    }

    '@test setting length to 0'(assert) {
      let obj = ArrayProxy.create({ content: ['foo', 'bar'] });

      assert.equal(obj.length, 2, 'precond');

      set(obj, 'length', 0);

      assert.equal(obj.length, 0, 'length was updated');
      assert.deepEqual(obj.content, [], 'content length was truncated');
    }

    '@test setting length to smaller value'(assert) {
      let obj = ArrayProxy.create({ content: ['foo', 'bar'] });

      assert.equal(obj.length, 2, 'precond');

      set(obj, 'length', 1);

      assert.equal(obj.length, 1, 'length was updated');
      assert.deepEqual(obj.content, ['foo'], 'content length was truncated');
    }

    '@test setting length to larger value'(assert) {
      let obj = ArrayProxy.create({ content: ['foo', 'bar'] });

      assert.equal(obj.length, 2, 'precond');

      set(obj, 'length', 3);

      assert.equal(obj.length, 3, 'length was updated');
      assert.deepEqual(obj.content, ['foo', 'bar', undefined], 'content length was updated');
    }

    '@test setting length after content set to null'(assert) {
      let obj = ArrayProxy.create({ content: ['foo', 'bar'] });

      assert.equal(obj.length, 2, 'precond');

      set(obj, 'content', null);
      assert.equal(obj.length, 0, 'length was updated');

      set(obj, 'length', 0);
      assert.equal(obj.length, 0, 'length is still updated');
    }

    '@test setting length to greater than zero'(assert) {
      let obj = ArrayProxy.create({ content: ['foo', 'bar'] });

      assert.equal(obj.length, 2, 'precond');

      set(obj, 'length', 1);

      assert.equal(obj.length, 1, 'length was updated');
      assert.deepEqual(obj.content, ['foo'], 'content length was truncated');
    }

    async ['@test array proxy + aliasedProperty complex test'](assert) {
      let aCalled, bCalled, cCalled, dCalled, eCalled;

      aCalled = bCalled = cCalled = dCalled = eCalled = 0;

      let obj = EmberObject.extend({
        colors: reads('model'),
        length: reads('colors.length'),

        a: observer('length', () => aCalled++),
        b: observer('colors.length', () => bCalled++),
        c: observer('colors.content.length', () => cCalled++),
        d: observer('colors.[]', () => dCalled++),
        e: observer('colors.content.[]', () => eCalled++),
      }).create();

      // bootstrap aliases
      obj.length;

      obj.set(
        'model',
        ArrayProxy.create({
          content: a(['red', 'yellow', 'blue']),
        })
      );

      await runLoopSettled();

      assert.equal(obj.get('colors.content.length'), 3);
      assert.equal(obj.get('colors.length'), 3);
      assert.equal(obj.get('length'), 3);

      assert.equal(aCalled, 1, 'expected observer `length` to be called ONCE');
      assert.equal(bCalled, 1, 'expected observer `colors.length` to be called ONCE');
      assert.equal(cCalled, 1, 'expected observer `colors.content.length` to be called ONCE');
      assert.equal(dCalled, 1, 'expected observer `colors.[]` to be called ONCE');
      assert.equal(eCalled, 1, 'expected observer `colors.content.[]` to be called ONCE');

      obj.get('colors').pushObjects(['green', 'red']);
      await runLoopSettled();

      assert.equal(obj.get('colors.content.length'), 5);
      assert.equal(obj.get('colors.length'), 5);
      assert.equal(obj.get('length'), 5);

      assert.equal(aCalled, 2, 'expected observer `length` to be called TWICE');
      assert.equal(bCalled, 2, 'expected observer `colors.length` to be called TWICE');
      assert.equal(cCalled, 2, 'expected observer `colors.content.length` to be called TWICE');
      assert.equal(dCalled, 2, 'expected observer `colors.[]` to be called TWICE');
      assert.equal(eCalled, 2, 'expected observer `colors.content.[]` to be called TWICE');

      obj.destroy();
    }

    async ['@test array proxy length is reactive when accessed normally'](assert) {
      let proxy = ArrayProxy.create({
        content: a([1, 2, 3]),
      });

      let lengthCache = createCache(() => proxy.length);

      assert.equal(getValue(lengthCache), 3, 'length is correct');

      proxy.pushObject(4);

      assert.equal(getValue(lengthCache), 4, 'length is correct');

      proxy.removeObject(1);

      assert.equal(getValue(lengthCache), 3, 'length is correct');

      proxy.set('content', []);

      assert.equal(getValue(lengthCache), 0, 'length is correct');
    }

    async ['@test array proxy length is reactive when accessed using get'](assert) {
      let proxy = ArrayProxy.create({
        content: a([1, 2, 3]),
      });

      let lengthCache = createCache(() => get(proxy, 'length'));

      assert.equal(getValue(lengthCache), 3, 'length is correct');

      proxy.pushObject(4);

      assert.equal(getValue(lengthCache), 4, 'length is correct');

      proxy.removeObject(1);

      assert.equal(getValue(lengthCache), 3, 'length is correct');

      proxy.set('content', []);

      assert.equal(getValue(lengthCache), 0, 'length is correct');
    }
  }
);
