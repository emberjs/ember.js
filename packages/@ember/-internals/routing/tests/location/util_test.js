import { assign } from '@ember/polyfills';
import { replacePath, getPath, getQuery, getFullPath } from '../../lib/location/util';
import { supportsHistory, supportsHashChange } from '../../lib/location/util';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

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

moduleFor(
  'Location Utilities',
  class extends AbstractTestCase {
    ['@test replacePath cannot be used to redirect to a different origin'](assert) {
      assert.expect(1);

      let expectedURL;

      let location = {
        protocol: 'http:',
        hostname: 'emberjs.com',
        port: '1337',

        replace(url) {
          assert.equal(url, expectedURL);
        },
      };

      expectedURL = 'http://emberjs.com:1337//google.com';
      replacePath(location, '//google.com');
    }

    ['@test getPath() should normalize location.pathname, making sure it always returns a leading slash'](
      assert
    ) {
      let location = mockBrowserLocation({ pathname: 'test' }, assert);
      assert.equal(getPath(location), '/test', 'When there is no leading slash, one is added.');

      location = mockBrowserLocation({ pathname: '/test' }, assert);
      assert.equal(
        getPath(location),
        '/test',
        "When a leading slash is already there, it isn't added again"
      );
    }

    ['@test getQuery() should return location.search as-is'](assert) {
      let location = mockBrowserLocation({ search: '?foo=bar' }, assert);
      assert.equal(getQuery(location), '?foo=bar');
    }

    ['@test getFullPath() should return full pathname including query and hash'](assert) {
      let location = mockBrowserLocation(
        {
          href: 'http://test.com/about?foo=bar#foo',
          pathname: '/about',
          search: '?foo=bar',
          hash: '#foo',
        },
        assert
      );

      assert.equal(getFullPath(location), '/about?foo=bar#foo');
    }

    ['@test Feature-Detecting onhashchange'](assert) {
      assert.equal(
        supportsHashChange(undefined, { onhashchange() {} }),
        true,
        'When not in IE, use onhashchange existence as evidence of the feature'
      );
      assert.equal(
        supportsHashChange(undefined, {}),
        false,
        'When not in IE, use onhashchange absence as evidence of the feature absence'
      );
      assert.equal(
        supportsHashChange(7, { onhashchange() {} }),
        false,
        'When in IE7 compatibility mode, never report existence of the feature'
      );
      assert.equal(
        supportsHashChange(8, { onhashchange() {} }),
        true,
        'When in IE8+, use onhashchange existence as evidence of the feature'
      );
    }

    ['@test Feature-detecting the history API'](assert) {
      assert.equal(
        supportsHistory('', { pushState: true }),
        true,
        'returns true if not Android Gingerbread and history.pushState exists'
      );
      assert.equal(
        supportsHistory('', {}),
        false,
        "returns false if history.pushState doesn't exist"
      );
      assert.equal(supportsHistory('', undefined), false, "returns false if history doesn't exist");

      assert.equal(
        supportsHistory(
          'Mozilla/5.0 (Linux; U; Android 2.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
          { pushState: true }
        ),
        false,
        'returns false if Android 2.x stock browser (not Chrome) claiming to support pushState'
      );

      assert.equal(
        supportsHistory(
          'Mozilla/5.0 (Linux; U; Android 4.0.3; nl-nl; GT-N7000 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
          { pushState: true }
        ),
        false,
        'returns false for Android 4.0.x stock browser (not Chrome) claiming to support pushState'
      );

      assert.equal(
        supportsHistory(
          'Mozilla/5.0 (Linux; U; Android 20.3.5; en-us; HTC Vision Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
          { pushState: true }
        ),
        true,
        'returns true if Android version begins with 2, but is greater than 2'
      );

      assert.equal(
        supportsHistory(
          'Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19',
          { pushState: true }
        ),
        true,
        'returns true for Chrome (not stock browser) on Android 4.0.x'
      );

      // Windows Phone UA and History API: https://github.com/Modernizr/Modernizr/issues/1471
      assert.equal(
        supportsHistory(
          'Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; Microsoft; Virtual) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537',
          { pushState: true }
        ),
        true,
        'returns true for Windows Phone 8.1 with misleading user agent string'
      );
    }
  }
);
