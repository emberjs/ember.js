import { run } from '@ember/runloop';
import { set } from '@ember/object';
import NoneLocation from '@ember/routing/none-location';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let NoneTestLocation, location;

moduleFor(
  'NoneLocation',
  class extends AbstractTestCase {
    constructor() {
      super();
      NoneTestLocation = class extends NoneLocation {};
    }

    teardown() {
      run(() => {
        if (location) {
          location.destroy();
        }
      });
    }

    ['@test NoneLocation.formatURL() returns the current url always appending rootURL'](assert) {
      class TestLocation extends NoneTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'rootURL', '/en/');
        }
      }

      location = TestLocation.create();

      assert.equal(location.formatURL('/foo/bar'), '/en/foo/bar');
    }

    ['@test NoneLocation.getURL() returns the current path minus rootURL'](assert) {
      class TestLocation extends NoneTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'rootURL', '/foo/');
          set(this, 'path', '/foo/bar');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/bar');
    }

    ['@test NoneLocation.getURL() will remove the rootURL only from the beginning of a url'](
      assert
    ) {
      class TestLocation extends NoneTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'rootURL', '/bar/');
          set(this, 'path', '/foo/bar/baz');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/foo/bar/baz');
    }

    ['@test NoneLocation.getURL() will not remove the rootURL when only a partial match'](assert) {
      class TestLocation extends NoneTestLocation {
        init() {
          super.init(...arguments);
          set(this, 'rootURL', '/bar/');
          set(this, 'path', '/bars/baz');
        }
      }

      location = TestLocation.create();

      assert.equal(location.getURL(), '/bars/baz');
    }
  }
);
