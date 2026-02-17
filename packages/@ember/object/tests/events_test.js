import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';
import { moduleFor, AbstractTestCase, expectDeprecation, testUnless } from 'internal-test-helpers';
import { DEPRECATIONS } from '../../-internals/deprecations';

moduleFor(
  'Object events',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test a listener can be added to an object`](assert) {
      let count = 0;
      let F = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(
        () => {
          obj.on('event!', F);
        },
        /Evented#on` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );
      expectDeprecation(
        () => {
          obj.trigger('event!');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(count, 1, 'the event was triggered');

      expectDeprecation(
        () => {
          obj.trigger('event!');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(count, 2, 'the event was triggered');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test a listener can be added and removed automatically the first time it is triggered`](
      assert
    ) {
      let count = 0;
      let F = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(
        () => {
          obj.one('event!', F);
        },
        /Evented#one` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.trigger('event!');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(count, 1, 'the event was triggered');

      expectDeprecation(
        () => {
          obj.trigger('event!');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(count, 1, 'the event was not triggered again');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test triggering an event can have arguments`](assert) {
      let self, args;

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(
        () => {
          obj.on('event!', function () {
            args = [].slice.call(arguments);
            self = this;
          });
        },
        /Evented#on` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.trigger('event!', 'foo', 'bar');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(self, obj);
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test a listener can be added and removed automatically and have arguments`](assert) {
      let self, args;
      let count = 0;

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(
        () => {
          obj.one('event!', function () {
            args = [].slice.call(arguments);
            self = this;
            count++;
          });
        },
        /Evented#one` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.trigger('event!', 'foo', 'bar');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(self, obj);
      assert.equal(count, 1, 'the event is triggered once');

      expectDeprecation(
        () => {
          obj.trigger('event!', 'baz', 'bat');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(count, 1, 'the event was not triggered again');
      assert.equal(self, obj);
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test binding an event can specify a different target`](assert) {
      let self, args;

      let obj = EmberObject.extend(Evented).create();
      let target = {};

      expectDeprecation(
        () => {
          obj.on('event!', target, function () {
            args = [].slice.call(arguments);
            self = this;
          });
        },
        /Evented#on` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.trigger('event!', 'foo', 'bar');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.deepEqual(args, ['foo', 'bar']);
      assert.equal(self, target);
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test a listener registered with one can take method as string and can be added with different target`](
      assert
    ) {
      let count = 0;
      let target = {};
      target.fn = function () {
        count++;
      };

      let obj = EmberObject.extend(Evented).create();

      expectDeprecation(
        () => {
          obj.one('event!', target, 'fn');
        },
        /Evented#one` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.trigger('event!');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(count, 1, 'the event was triggered');

      expectDeprecation(
        () => {
          obj.trigger('event!');
        },
        /Evented#trigger` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(count, 1, 'the event was not triggered again');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test a listener registered with one can be removed with off`](assert) {
      let obj = class extends EmberObject.extend(Evented) {
        F() {}
      }.create();
      let F = function () {};

      expectDeprecation(
        () => {
          obj.one('event!', F);
        },
        /Evented#one` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.one('event!', obj, 'F');
        },
        /Evented#one` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      let objHas;
      expectDeprecation(
        () => {
          objHas = obj.has('event!');
        },
        /Evented#has` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );
      assert.equal(objHas, true, 'has events');

      expectDeprecation(
        () => {
          obj.off('event!', F);
        },
        /Evented#off` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          obj.off('event!', obj, 'F');
        },
        /Evented#off` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      expectDeprecation(
        () => {
          objHas = obj.has('event!');
        },
        /Evented#has` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );

      assert.equal(objHas, false, 'has no more events');
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_EVENTED.isRemoved
    )} @test adding and removing listeners should be chainable`](assert) {
      let obj = EmberObject.extend(Evented).create();
      let F = function () {};

      let ret;

      expectDeprecation(
        () => {
          ret = obj.on('event!', F);
        },
        /Evented#on` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );
      assert.equal(ret, obj, '#on returns self');

      expectDeprecation(
        () => {
          ret = obj.off('event!', F);
        },
        /Evented#off` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );
      assert.equal(ret, obj, '#off returns self');

      expectDeprecation(
        () => {
          ret = obj.one('event!', F);
        },
        /Evented#one` is deprecated/,
        DEPRECATIONS.DEPRECATE_EVENTED.isEnabled
      );
      assert.equal(ret, obj, '#one returns self');
    }
  }
);
