import HashLocation from '@ember/routing/hash-location';
import HistoryLocation from '@ember/routing/history-location';
import NoneLocation from '@ember/routing/none-location';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function fakeLocation(url) {
  let parsed = new window.URL(url, 'http://localhost');
  let hash = parsed.hash;

  return {
    get hash() {
      return hash;
    },
    // Browsers add the `#` when the hash is set.
    set hash(value) {
      hash = value.startsWith('#') ? value : `#${value}`;
    },
    pathname: parsed.pathname,
    search: parsed.search,
    replace(path) {
      this.hash = path;
    },
  };
}

function fakeHistory() {
  return {
    state: null,
    pushState(state) {
      this.state = state;
    },
    replaceState(state) {
      this.state = state;
    },
  };
}

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: locations',
    class extends AbstractTestCase {
      ['@test the location classes extend no other class'](assert) {
        for (let klass of [HashLocation, HistoryLocation, NoneLocation]) {
          assert.strictEqual(Object.getPrototypeOf(klass), Function.prototype, klass.name);
        }
      }

      ['@test NoneLocation keeps the path in memory'](assert) {
        let location = new NoneLocation();

        location.rootURL = '/app/';
        location.setURL('/app/posts');

        assert.strictEqual(location.getURL(), '/posts');
        assert.strictEqual(location.formatURL('/posts'), '/app/posts');

        location.onUpdateURL((url) => assert.step(`update ${url}`));
        location.handleURL('/app/comments');

        assert.verifySteps(['update /app/comments']);
      }

      ['@test HashLocation reads and writes the hash'](assert) {
        let location = new HashLocation();

        location.location = fakeLocation('/#/posts?page=2');

        assert.strictEqual(location.getURL(), '/posts?page=2');

        location.setURL('/comments');

        assert.strictEqual(location.location.hash, '#/comments');
        assert.strictEqual(location.formatURL('/comments'), '#/comments');
      }

      ['@test HashLocation ignores the hashchange event of its own setURL'](assert) {
        let location = new HashLocation();
        let browserLocation = fakeLocation('/#/posts');

        location.location = browserLocation;
        location.onUpdateURL((url) => assert.step(`update ${url}`));

        location.setURL('/posts');
        window.dispatchEvent(new Event('hashchange'));

        browserLocation.hash = '#/comments';
        window.dispatchEvent(new Event('hashchange'));

        location.willDestroy();
        window.dispatchEvent(new Event('hashchange'));

        assert.verifySteps(['update /comments']);
      }

      ['@test HistoryLocation removes the rootURL and the baseURL'](assert) {
        let location = new HistoryLocation();

        location.location = fakeLocation('/base/app/posts?page=2#top');
        location.history = fakeHistory();
        location.baseURL = '/base/';
        location.rootURL = '/app/';

        assert.strictEqual(location.getURL(), '/posts?page=2#top');
        assert.strictEqual(location.formatURL('/posts'), '/base/app/posts');

        location.setURL('/comments');

        assert.strictEqual(location.history.state.path, '/base/app/comments');
      }

      ['@test HistoryLocation runs its callback on popstate until it is destroyed'](assert) {
        let location = new HistoryLocation();

        location.location = fakeLocation('/posts');
        location.onUpdateURL((url) => assert.step(`update ${url}`));

        window.dispatchEvent(new Event('popstate'));

        location.willDestroy();
        window.dispatchEvent(new Event('popstate'));

        assert.verifySteps(['update /posts']);
      }
    }
  );
}
