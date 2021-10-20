import EmberObject from '../../../lib/system/object';
import Evented from '../../../lib/mixins/evented';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Object events',
  class extends AbstractTestCase {
    ['@test a listener can be added to an object'](assert) {
      let count = 0;
      let F = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      obj.on('event!', F);
      obj.trigger('event!');

      assert.strictEqual(count, 1, 'the event was triggered');

      obj.trigger('event!');

      assert.strictEqual(count, 2, 'the event was triggered');
    }

    ['@test a listener can be added and removed automatically the first time it is triggered'](
      assert
    ) {
      let count = 0;
      let F = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      obj.one('event!', F);
      obj.trigger('event!');

      assert.strictEqual(count, 1, 'the event was triggered');

      obj.trigger('event!');

      assert.strictEqual(count, 1, 'the event was not triggered again');
    }

    ['@test triggering an event can have arguments'](assert) {
      let self, args;

      let obj = EmberObject.extend(Evented).create();

      obj.on('event!', function () {
        args = [].slice.call(arguments);
        self = this;
      });

      obj.trigger('event!', 'foo', 'bar');

      assert.deepEqual(args, ['foo', 'bar']);
      assert.strictEqual(self, obj);
    }

    ['@test a listener can be added and removed automatically and have arguments'](assert) {
      let self, args;
      let count = 0;

      let obj = EmberObject.extend(Evented).create();

      obj.one('event!', function () {
        args = [].slice.call(arguments);
        self = this;
        count++;
      });

      obj.trigger('event!', 'foo', 'bar');

      assert.deepEqual(args, ['foo', 'bar']);
      assert.strictEqual(self, obj);
      assert.strictEqual(count, 1, 'the event is triggered once');

      obj.trigger('event!', 'baz', 'bat');

      assert.deepEqual(args, ['foo', 'bar']);
      assert.strictEqual(count, 1, 'the event was not triggered again');
      assert.strictEqual(self, obj);
    }

    ['@test binding an event can specify a different target'](assert) {
      let self, args;

      let obj = EmberObject.extend(Evented).create();
      let target = {};

      obj.on('event!', target, function () {
        args = [].slice.call(arguments);
        self = this;
      });

      obj.trigger('event!', 'foo', 'bar');

      assert.deepEqual(args, ['foo', 'bar']);
      assert.strictEqual(self, target);
    }

    ['@test a listener registered with one can take method as string and can be added with different target'](
      assert
    ) {
      let count = 0;
      let target = {};
      target.fn = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      obj.one('event!', target, 'fn');
      obj.trigger('event!');

      assert.strictEqual(count, 1, 'the event was triggered');

      obj.trigger('event!');

      assert.strictEqual(count, 1, 'the event was not triggered again');
    }

    ['@test a listener registered with one can be removed with off'](assert) {
      let obj = EmberObject.extend(Evented, {
        F() {},
      }).create();
      let F = function () {};

      obj.one('event!', F);
      obj.one('event!', obj, 'F');

      assert.strictEqual(obj.has('event!'), true, 'has events');

      obj.off('event!', F);
      obj.off('event!', obj, 'F');

      assert.strictEqual(obj.has('event!'), false, 'has no more events');
    }

    ['@test adding and removing listeners should be chainable'](assert) {
      let obj = EmberObject.extend(Evented).create();
      let F = function () {};

      let ret = obj.on('event!', F);
      assert.strictEqual(ret, obj, '#on returns self');

      ret = obj.off('event!', F);
      assert.strictEqual(ret, obj, '#off returns self');

      ret = obj.one('event!', F);
      assert.strictEqual(ret, obj, '#one returns self');
    }
  }
);
