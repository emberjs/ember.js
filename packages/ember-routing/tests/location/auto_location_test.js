import { OWNER } from '@ember/-internals/owner';
import { assign } from '@ember/polyfills';
import { window } from '@ember/-internals/browser-environment';
import { run } from '@ember/runloop';
import { get } from 'ember-metal';
import AutoLocation from '../../lib/location/auto_location';
import { getHistoryPath, getHashPath } from '../../lib/location/auto_location';
import HistoryLocation from '../../lib/location/history_location';
import HashLocation from '../../lib/location/hash_location';
import NoneLocation from '../../lib/location/none_location';
import { buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';

function mockBrowserLocation(overrides, assert) {
  return assign(
    {
      href: 'http://test.com/',
      pathname: '/',
      hash: '',
      search: '',
      replace() {
        assert.ok(false, 'location.replace should not be called during testing');
      },
    },
    overrides
  );
}

function mockBrowserHistory(overrides, assert) {
  return assign(
    {
      pushState() {
        assert.ok(false, 'history.pushState should not be called during testing');
      },
      replaceState() {
        assert.ok(false, 'history.replaceState should not be called during testing');
      },
    },
    overrides
  );
}

function createLocation(location, history) {
  owner = buildOwner();

  owner.register('location:history', HistoryLocation);
  owner.register('location:hash', HashLocation);
  owner.register('location:none', NoneLocation);

  let autolocation = AutoLocation.create({
    [OWNER]: owner,
    location: location,
    history: history,
    global: {},
  });

  return autolocation;
}

let location, owner;

moduleFor(
  'AutoLocation',
  class extends AbstractTestCase {
    teardown() {
      if (owner) {
        run(owner, 'destroy');
        owner = location = undefined;
      }
    }

    ['@test AutoLocation should have the `global`'](assert) {
      let location = AutoLocation.create();

      assert.ok(location.global, 'has a global defined');
      assert.strictEqual(location.global, window, 'has the environments window global');
    }

    ["@test AutoLocation should return concrete implementation's value for `getURL`"](assert) {
      let browserLocation = mockBrowserLocation({}, assert);
      let browserHistory = mockBrowserHistory({}, assert);

      location = createLocation(browserLocation, browserHistory);
      location.detect();

      let concreteImplementation = get(location, 'concreteImplementation');

      concreteImplementation.getURL = function() {
        return '/lincoln/park';
      };

      assert.equal(location.getURL(), '/lincoln/park');
    }

    ['@test AutoLocation should use a HistoryLocation instance when pushStates is supported'](
      assert
    ) {
      let browserLocation = mockBrowserLocation({}, assert);
      let browserHistory = mockBrowserHistory({}, assert);

      location = createLocation(browserLocation, browserHistory);
      location.detect();

      assert.ok(get(location, 'concreteImplementation') instanceof HistoryLocation);
    }

    ['@test AutoLocation should use a HashLocation instance when pushStates are not supported, but hashchange events are and the URL is already in the HashLocation format'](
      assert
    ) {
      let browserLocation = mockBrowserLocation(
        {
          hash: '#/testd',
        },
        assert
      );

      location = createLocation(browserLocation);
      location.global = {
        onhashchange() {},
      };

      location.detect();
      assert.ok(get(location, 'concreteImplementation') instanceof HashLocation);
    }

    ['@test AutoLocation should use a NoneLocation instance when neither history nor hashchange are supported.'](
      assert
    ) {
      location = createLocation(mockBrowserLocation({}, assert));
      location.detect();

      assert.ok(get(location, 'concreteImplementation') instanceof NoneLocation);
    }

    ["@test AutoLocation should use an index path (i.e. '/') without any location.hash as OK for HashLocation"](
      assert
    ) {
      let browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/',
          pathname: '/',
          hash: '',
          search: '',
          replace() {
            assert.ok(false, 'location.replace should not be called');
          },
        },
        assert
      );

      location = createLocation(browserLocation);
      location.global = {
        onhashchange() {},
      };

      location.detect();

      assert.ok(
        get(location, 'concreteImplementation') instanceof HashLocation,
        'uses a HashLocation'
      );
    }

    ['@test AutoLocation should transform the URL for hashchange-only browsers viewing a HistoryLocation-formatted path'](
      assert
    ) {
      assert.expect(3);

      let browserLocation = mockBrowserLocation(
        {
          hash: '',
          hostname: 'test.com',
          href: 'http://test.com/test',
          pathname: '/test',
          protocol: 'http:',
          port: '',
          search: '',
          replace(path) {
            assert.equal(
              path,
              'http://test.com/#/test',
              'location.replace should be called with normalized HashLocation path'
            );
          },
        },
        assert
      );

      let location = createLocation(browserLocation);
      location.global = {
        onhashchange() {},
      };

      location.detect();

      assert.ok(
        get(location, 'concreteImplementation') instanceof NoneLocation,
        'NoneLocation should be used while we attempt to location.replace()'
      );
      assert.equal(
        get(location, 'cancelRouterSetup'),
        true,
        'cancelRouterSetup should be set so the router knows.'
      );
    }

    ['@test AutoLocation should replace the URL for pushState-supported browsers viewing a HashLocation-formatted url'](
      assert
    ) {
      assert.expect(2);
      let browserLocation = mockBrowserLocation(
        {
          hash: '#/test',
          hostname: 'test.com',
          href: 'http://test.com/#/test',
          pathname: '/',
          protocol: 'http:',
          port: '',
          search: '',
        },
        assert
      );

      let browserHistory = mockBrowserHistory(
        {
          replaceState(state, title, path) {
            assert.equal(
              path,
              '/test',
              'history.replaceState should be called with normalized HistoryLocation url'
            );
          },
        },
        assert
      );

      let location = createLocation(browserLocation, browserHistory);
      location.detect();

      assert.ok(get(location, 'concreteImplementation'), HistoryLocation);
    }

    ['@test AutoLocation requires any rootURL given to end in a trailing forward slash'](assert) {
      let browserLocation = mockBrowserLocation({}, assert);
      let expectedMsg = /rootURL must end with a trailing forward slash e.g. "\/app\/"/;

      location = createLocation(browserLocation);
      location.rootURL = 'app';

      expectAssertion(function() {
        location.detect();
      }, expectedMsg);

      location.rootURL = '/app';
      expectAssertion(function() {
        location.detect();
      }, expectedMsg);

      // Note the trailing whitespace
      location.rootURL = '/app/ ';
      expectAssertion(function() {
        location.detect();
      }, expectedMsg);
    }

    ['@test AutoLocation provides its rootURL to the concreteImplementation'](assert) {
      let browserLocation = mockBrowserLocation(
        {
          pathname: '/some/subdir/derp',
        },
        assert
      );
      let browserHistory = mockBrowserHistory({}, assert);

      location = createLocation(browserLocation, browserHistory);
      location.rootURL = '/some/subdir/';

      location.detect();

      let concreteLocation = get(location, 'concreteImplementation');
      assert.equal(location.rootURL, concreteLocation.rootURL);
    }

    ['@test getHistoryPath() should return a normalized, HistoryLocation-supported path'](assert) {
      let browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/app/about?foo=bar#foo',
          pathname: '/app/about',
          search: '?foo=bar',
          hash: '#foo',
        },
        assert
      );

      assert.equal(
        getHistoryPath('/app/', browserLocation),
        '/app/about?foo=bar#foo',
        'URLs already in HistoryLocation form should come out the same'
      );

      browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/app/#/about?foo=bar#foo',
          pathname: '/app/',
          search: '',
          hash: '#/about?foo=bar#foo',
        },
        assert
      );
      assert.equal(
        getHistoryPath('/app/', browserLocation),
        '/app/about?foo=bar#foo',
        'HashLocation formed URLs should be normalized'
      );

      browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/app/#about?foo=bar#foo',
          pathname: '/app/',
          search: '',
          hash: '#about?foo=bar#foo',
        },
        assert
      );
      assert.equal(
        getHistoryPath('/app', browserLocation),
        '/app/#about?foo=bar#foo',
        "URLs with a hash not following #/ convention shouldn't be normalized as a route"
      );
    }

    ['@test getHashPath() should return a normalized, HashLocation-supported path'](assert) {
      let browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/app/#/about?foo=bar#foo',
          pathname: '/app/',
          search: '',
          hash: '#/about?foo=bar#foo',
        },
        assert
      );
      assert.equal(
        getHashPath('/app/', browserLocation),
        '/app/#/about?foo=bar#foo',
        'URLs already in HistoryLocation form should come out the same'
      );

      browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/app/about?foo=bar#foo',
          pathname: '/app/about',
          search: '?foo=bar',
          hash: '#foo',
        },
        assert
      );
      assert.equal(
        getHashPath('/app/', browserLocation),
        '/app/#/about?foo=bar#foo',
        'HistoryLocation formed URLs should be normalized'
      );

      browserLocation = mockBrowserLocation(
        {
          href: 'http://test.com/app/#about?foo=bar#foo',
          pathname: '/app/',
          search: '',
          hash: '#about?foo=bar#foo',
        },
        assert
      );

      assert.equal(
        getHashPath('/app/', browserLocation),
        '/app/#/#about?foo=bar#foo',
        "URLs with a hash not following #/ convention shouldn't be normalized as a route"
      );
    }
  }
);
