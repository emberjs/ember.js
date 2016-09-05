import { set, run } from 'ember-metal';
import NoneLocation from '../../location/none_location';

let NoneTestLocation, location;

function createLocation(options) {
  if (!options) { options = {}; }
  location = NoneTestLocation.create(options);
}

QUnit.module('Ember.NoneLocation', {
  setup() {
    NoneTestLocation = NoneLocation.extend({});
  },

  teardown() {
    run(() => {
      if (location) { location.destroy(); }
    });
  }
});

QUnit.test('NoneLocation.formatURL() returns the current url always appending rootURL', function() {
  expect(1);

  NoneTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'rootURL', '/en/');
    }
  });

  createLocation();

  equal(location.formatURL('/foo/bar'), '/en/foo/bar');
});

QUnit.test('NoneLocation.getURL() returns the current path minus rootURL', function() {
  expect(1);

  NoneTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'rootURL', '/foo/');
      set(this, 'path', '/foo/bar');
    }
  });

  createLocation();

  equal(location.getURL(), '/bar');
});

QUnit.test('NoneLocation.getURL() will remove the rootURL only from the beginning of a url', function() {
  expect(1);

  NoneTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'rootURL', '/bar/');
      set(this, 'path', '/foo/bar/baz');
    }
  });

  createLocation();

  equal(location.getURL(), '/foo/bar/baz');
});

QUnit.test('NoneLocation.getURL() will not remove the rootURL when only a partial match', function() {
  expect(1);

  NoneTestLocation.reopen({
    init() {
      this._super(...arguments);
      set(this, 'rootURL', '/bar/');
      set(this, 'path', '/bars/baz');
    }
  });

  createLocation();

  equal(location.getURL(), '/bars/baz');
});
