import { replacePath, getPath, getQuery, getFullPath } from '../../lib/location-utils';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function mockBrowserLocation(overrides, assert) {
  return Object.assign(
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
  }
);
