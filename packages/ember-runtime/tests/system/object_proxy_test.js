import { DEBUG } from '@glimmer/env';
import { addObserver, computed, get, set, isWatching, removeObserver } from 'ember-metal';
import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';
import ObjectProxy from '../../lib/system/object_proxy';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ObjectProxy',
  class extends AbstractTestCase {
    ['@test should not proxy properties passed to create'](assert) {
      let Proxy = ObjectProxy.extend({
        cp: computed({
          get() {
            return this._cp;
          },
          set(key, value) {
            this._cp = value;
            return this._cp;
          },
        }),
      });
      let proxy = Proxy.create({
        prop: 'Foo',
        cp: 'Bar',
      });

      assert.equal(get(proxy, 'prop'), 'Foo', 'should not have tried to proxy set');
      assert.equal(proxy._cp, 'Bar', 'should use CP setter');
    }

    ['@test should proxy properties to content'](assert) {
      let content = {
        firstName: 'Tom',
        lastName: 'Dale',
        unknownProperty(key) {
          return key + ' unknown';
        },
      };
      let proxy = ObjectProxy.create();

      assert.equal(
        get(proxy, 'firstName'),
        undefined,
        'get on proxy without content should return undefined'
      );
      expectAssertion(() => {
        set(proxy, 'firstName', 'Foo');
      }, /Cannot delegate set\('firstName', Foo\) to the 'content'/i);

      set(proxy, 'content', content);

      assert.equal(
        get(proxy, 'firstName'),
        'Tom',
        'get on proxy with content should forward to content'
      );
      assert.equal(
        get(proxy, 'lastName'),
        'Dale',
        'get on proxy with content should forward to content'
      );
      assert.equal(
        get(proxy, 'foo'),
        'foo unknown',
        'get on proxy with content should forward to content'
      );

      set(proxy, 'lastName', 'Huda');

      assert.equal(
        get(content, 'lastName'),
        'Huda',
        'content should have new value from set on proxy'
      );
      assert.equal(get(proxy, 'lastName'), 'Huda', 'proxy should have new value from set on proxy');

      set(proxy, 'content', { firstName: 'Yehuda', lastName: 'Katz' });

      assert.equal(get(proxy, 'firstName'), 'Yehuda', 'proxy should reflect updated content');
      assert.equal(get(proxy, 'lastName'), 'Katz', 'proxy should reflect updated content');
    }

    ['@test getting proxied properties with Ember.get should work'](assert) {
      let proxy = ObjectProxy.create({
        content: {
          foo: 'FOO',
        },
      });

      assert.equal(get(proxy, 'foo'), 'FOO');
    }

    [`@test JSON.stringify doens't assert`](assert) {
      let proxy = ObjectProxy.create({
        content: {
          foo: 'FOO',
        },
      });

      assert.equal(JSON.stringify(proxy), JSON.stringify({ content: { foo: 'FOO' } }));
    }

    ['@test calling a function on the proxy avoids the assertion'](assert) {
      if (DEBUG && HAS_NATIVE_PROXY) {
        let proxy = ObjectProxy.extend({
          init() {
            if (!this.foobar) {
              this.foobar = function() {
                let content = get(this, 'content');
                return content.foobar.apply(content, []);
              };
            }
          },
        }).create({
          content: {
            foobar() {
              return 'xoxo';
            },
          },
        });

        assert.equal(proxy.foobar(), 'xoxo', 'should be able to use a function from a proxy');
      } else {
        assert.expect(0);
      }
    }

    [`@test setting a property on the proxy avoids the assertion`](assert) {
      let proxy = ObjectProxy.create({
        toJSON: undefined,
        content: {
          toJSON() {
            return 'hello';
          },
        },
      });

      assert.equal(JSON.stringify(proxy), JSON.stringify({ content: 'hello' }));
    }

    [`@test setting a property on the proxy's prototype avoids the assertion`](assert) {
      let proxy = ObjectProxy.extend({
        toJSON: null,
      }).create({
        content: {
          toJSON() {
            return 'hello';
          },
        },
      });

      assert.equal(JSON.stringify(proxy), JSON.stringify({ content: 'hello' }));
    }

    ['@test getting proxied properties with [] should be an error'](assert) {
      if (DEBUG && HAS_NATIVE_PROXY) {
        let proxy = ObjectProxy.create({
          content: {
            foo: 'FOO',
          },
        });

        expectAssertion(() => proxy.foo, /\.get\('foo'\)/);
      } else {
        assert.expect(0);
      }
    }

    ['@test should work with watched properties'](assert) {
      let content1 = { firstName: 'Tom', lastName: 'Dale' };
      let content2 = { firstName: 'Yehuda', lastName: 'Katz' };
      let count = 0;
      let last;

      let Proxy = ObjectProxy.extend({
        fullName: computed(function() {
          let firstName = this.get('firstName');
          let lastName = this.get('lastName');

          if (firstName && lastName) {
            return firstName + ' ' + lastName;
          }
          return firstName || lastName;
        }).property('firstName', 'lastName'),
      });

      let proxy = Proxy.create();

      addObserver(proxy, 'fullName', function() {
        last = get(proxy, 'fullName');
        count++;
      });

      // proxy without content returns undefined
      assert.equal(get(proxy, 'fullName'), undefined);

      // setting content causes all watched properties to change
      set(proxy, 'content', content1);
      // both dependent keys changed
      assert.equal(count, 2);
      assert.equal(last, 'Tom Dale');

      // setting property in content causes proxy property to change
      set(content1, 'lastName', 'Huda');
      assert.equal(count, 3);
      assert.equal(last, 'Tom Huda');

      // replacing content causes all watched properties to change
      set(proxy, 'content', content2);
      // both dependent keys changed
      assert.equal(count, 5);
      assert.equal(last, 'Yehuda Katz');
      // content1 is no longer watched
      assert.ok(!isWatching(content1, 'firstName'), 'not watching firstName');
      assert.ok(!isWatching(content1, 'lastName'), 'not watching lastName');

      // setting property in new content
      set(content2, 'firstName', 'Tomhuda');
      assert.equal(last, 'Tomhuda Katz');
      assert.equal(count, 6);

      // setting property in proxy syncs with new content
      set(proxy, 'lastName', 'Katzdale');
      assert.equal(count, 7);
      assert.equal(last, 'Tomhuda Katzdale');
      assert.equal(get(content2, 'firstName'), 'Tomhuda');
      assert.equal(get(content2, 'lastName'), 'Katzdale');
    }

    ['@test set and get should work with paths'](assert) {
      let content = { foo: { bar: 'baz' } };
      let proxy = ObjectProxy.create({ content });
      let count = 0;

      proxy.set('foo.bar', 'hello');
      assert.equal(proxy.get('foo.bar'), 'hello');
      assert.equal(proxy.get('content.foo.bar'), 'hello');

      proxy.addObserver('foo.bar', function() {
        count++;
      });

      proxy.set('foo.bar', 'bye');

      assert.equal(count, 1);
      assert.equal(proxy.get('foo.bar'), 'bye');
      assert.equal(proxy.get('content.foo.bar'), 'bye');
    }

    ['@test should transition between watched and unwatched strategies'](assert) {
      let content = { foo: 'foo' };
      let proxy = ObjectProxy.create({ content: content });
      let count = 0;

      function observer() {
        count++;
      }

      assert.equal(get(proxy, 'foo'), 'foo');

      set(content, 'foo', 'bar');

      assert.equal(get(proxy, 'foo'), 'bar');

      set(proxy, 'foo', 'foo');

      assert.equal(get(content, 'foo'), 'foo');
      assert.equal(get(proxy, 'foo'), 'foo');

      addObserver(proxy, 'foo', observer);

      assert.equal(count, 0);
      assert.equal(get(proxy, 'foo'), 'foo');

      set(content, 'foo', 'bar');

      assert.equal(count, 1);
      assert.equal(get(proxy, 'foo'), 'bar');

      set(proxy, 'foo', 'foo');

      assert.equal(count, 2);
      assert.equal(get(content, 'foo'), 'foo');
      assert.equal(get(proxy, 'foo'), 'foo');

      removeObserver(proxy, 'foo', observer);

      set(content, 'foo', 'bar');

      assert.equal(get(proxy, 'foo'), 'bar');

      set(proxy, 'foo', 'foo');

      assert.equal(get(content, 'foo'), 'foo');
      assert.equal(get(proxy, 'foo'), 'foo');
    }

    ['@test setting `undefined` to a proxied content property should override its existing value'](
      assert
    ) {
      let proxyObject = ObjectProxy.create({
        content: {
          prop: 'emberjs',
        },
      });
      set(proxyObject, 'prop', undefined);
      assert.equal(
        get(proxyObject, 'prop'),
        undefined,
        'sets the `undefined` value to the proxied content'
      );
    }
  }
);
