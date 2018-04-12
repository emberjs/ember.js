import { run } from '@ember/runloop';
import { set } from 'ember-metal';
import NoneLocation from '../../lib/location/none_location';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let NoneTestLocation, location;

function createLocation(options) {
  if (!options) {
    options = {};
  }
  location = NoneTestLocation.create(options);
}

moduleFor(
  'NoneLocation',
  class extends AbstractTestCase {
    constructor() {
      super();
      NoneTestLocation = NoneLocation.extend({});
    }

    teardown() {
      run(() => {
        if (location) {
          location.destroy();
        }
      });
    }

    ['@test NoneLocation.formatURL() returns the current url always appending rootURL'](assert) {
      NoneTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'rootURL', '/en/');
        },
      });

      createLocation();

      assert.equal(location.formatURL('/foo/bar'), '/en/foo/bar');
    }

    ['@test NoneLocation.getURL() returns the current path minus rootURL'](assert) {
      NoneTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'rootURL', '/foo/');
          set(this, 'path', '/foo/bar');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/bar');
    }

    ['@test NoneLocation.getURL() will remove the rootURL only from the beginning of a url'](
      assert
    ) {
      NoneTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'rootURL', '/bar/');
          set(this, 'path', '/foo/bar/baz');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/foo/bar/baz');
    }

    ['@test NoneLocation.getURL() will not remove the rootURL when only a partial match'](assert) {
      NoneTestLocation.reopen({
        init() {
          this._super(...arguments);
          set(this, 'rootURL', '/bar/');
          set(this, 'path', '/bars/baz');
        },
      });

      createLocation();

      assert.equal(location.getURL(), '/bars/baz');
    }
  }
);
