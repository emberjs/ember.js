import EmberObject from '@ember/object';
import { Evented } from '@ember/-internals/runtime';
import { moduleFor, AbstractTestCase, expectDeprecation } from 'internal-test-helpers';

moduleFor(
  'Object events',
  class extends AbstractTestCase {
    ['@test a listener can be added to an object'](assert) {
      let count = 0;
      let F = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(() => {
        obj.on('event!', F);
      }, /`on` is deprecated/);
      expectDeprecation(() => {
        obj.trigger('event!');
      }, /`trigger` is deprecated/);

      assert.equal(count, 1, 'the event was triggered');

      expectDeprecation(() => {
        obj.trigger('event!');
      }, /`trigger` is deprecated/);

      assert.equal(count, 2, 'the event was triggered');
    }

    ['@test a listener can be added and removed automatically the first time it is triggered'](
      assert
    ) {
      let count = 0;
      let F = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(() => {
        obj.one('event!', F);
      }, /`one` is deprecated/);

      expectDeprecation(() => {
        obj.trigger('event!');
      }, /`trigger` is deprecated/);

      assert.equal(count, 1, 'the event was triggered');

      expectDeprecation(() => {
        obj.trigger('event!');
      }, /`trigger` is deprecated/);

      assert.equal(count, 1, 'the event was not triggered again');
    }

    ['@test triggering an event can have arguments'](assert) {
      let self, args;

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(() => {
        obj.on('event!', function () {
          args = [].slice.call(arguments);
          self = this;
        });
      }, /`on` is deprecated/);

      expectDeprecation(() => {
        obj.trigger('event!', 'foo', 'bar');
      }, /`trigger` is deprecated/);

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(self, obj);
    }

    ['@test a listener can be added and removed automatically and have arguments'](assert) {
      let self, args;
      let count = 0;

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(() => {
        obj.one('event!', function () {
          args = [].slice.call(arguments);
          self = this;
          count++;
        });
      }, /`one` is deprecated/);

      expectDeprecation(() => {
        obj.trigger('event!', 'foo', 'bar');
      }, /`trigger` is deprecated/);

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(self, obj);
      assert.equal(count, 1, 'the event is triggered once');

      expectDeprecation(() => {
        obj.trigger('event!', 'baz', 'bat');
      }, /`trigger` is deprecated/);

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(count, 1, 'the event was not triggered again');
      assert.equal(self, obj);
    }

    ['@test binding an event can specify a different target'](assert) {
      let self, args;

      let obj = EmberObject.extend(Evented).create();
      let target = {};

      expectDeprecation(() => {
        obj.on('event!', target, function () {
          args = [].slice.call(arguments);
          self = this;
        });
      }, /`on` is deprecated/);

      expectDeprecation(() => {
        obj.trigger('event!', 'foo', 'bar');
      }, /`trigger` is deprecated/);

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(self, target);
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

      expectDeprecation(() => {
        obj.one('event!', target, 'fn');
      }, /`one` is deprecated/);

      expectDeprecation(() => {
        obj.trigger('event!');
      }, /`trigger` is deprecated/);

      assert.equal(count, 1, 'the event was triggered');

      expectDeprecation(() => {
        obj.trigger('event!');
      }, /`trigger` is deprecated/);

      assert.equal(count, 1, 'the event was not triggered again');
    }

    ['@test a listener registered with one can be removed with off'](assert) {
      let obj = class extends EmberObject.extend(Evented) {
        F() {}
      }.create();
      let F = function () {};

      expectDeprecation(() => {
        obj.one('event!', F);
      }, /`one` is deprecated/);

      expectDeprecation(() => {
        obj.one('event!', obj, 'F');
      }, /`one` is deprecated/);

      let objHas;
      expectDeprecation(() => {
        objHas = obj.has('event!');
      }, /`has` is deprecated/);
      assert.equal(objHas, true, 'has events');

      expectDeprecation(() => {
        obj.off('event!', F);
      }, /`off` is deprecated/);

      expectDeprecation(() => {
        obj.off('event!', obj, 'F');
      }, /`off` is deprecated/);

      expectDeprecation(() => {
        objHas = obj.has('event!');
      }, /`has` is deprecated/);

      assert.equal(objHas, false, 'has no more events');
    }

    ['@test adding and removing listeners should be chainable'](assert) {
      let obj = EmberObject.extend(Evented).create();
      let F = function () {};

      let ret;

      expectDeprecation(() => {
        ret = obj.on('event!', F);
      }, /`on` is deprecated/);
      assert.equal(ret, obj, '#on returns self');

      expectDeprecation(() => {
        ret = obj.off('event!', F);
      }, /`off` is deprecated/);
      assert.equal(ret, obj, '#off returns self');

      expectDeprecation(() => {
        ret = obj.one('event!', F);
      }, /`one` is deprecated/);
      assert.equal(ret, obj, '#one returns self');
    }
  }
);
