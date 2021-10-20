import { DEBUG } from '@glimmer/env';
import { addObserver, observer, computed, get, set, removeObserver } from '@ember/-internals/metal';
import ObjectProxy from '../../lib/system/object_proxy';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

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

      assert.strictEqual(get(proxy, 'prop'), 'Foo', 'should not have tried to proxy set');
      assert.strictEqual(proxy._cp, 'Bar', 'should use CP setter');
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

      assert.strictEqual(
        get(proxy, 'firstName'),
        undefined,
        'get on proxy without content should return undefined'
      );
      expectAssertion(() => {
        set(proxy, 'firstName', 'Foo');
      }, /Cannot delegate set\('firstName', Foo\) to the 'content'/i);

      set(proxy, 'content', content);

      assert.strictEqual(
        get(proxy, 'firstName'),
        'Tom',
        'get on proxy with content should forward to content'
      );
      assert.strictEqual(
        get(proxy, 'lastName'),
        'Dale',
        'get on proxy with content should forward to content'
      );
      assert.strictEqual(
        get(proxy, 'foo'),
        'foo unknown',
        'get on proxy with content should forward to content'
      );

      set(proxy, 'lastName', 'Huda');

      assert.strictEqual(
        get(content, 'lastName'),
        'Huda',
        'content should have new value from set on proxy'
      );
      assert.strictEqual(
        get(proxy, 'lastName'),
        'Huda',
        'proxy should have new value from set on proxy'
      );

      set(proxy, 'content', { firstName: 'Yehuda', lastName: 'Katz' });

      assert.strictEqual(get(proxy, 'firstName'), 'Yehuda', 'proxy should reflect updated content');
      assert.strictEqual(get(proxy, 'lastName'), 'Katz', 'proxy should reflect updated content');
    }

    ['@test getting proxied properties with Ember.get should work'](assert) {
      let proxy = ObjectProxy.create({
        content: {
          foo: 'FOO',
        },
      });

      assert.strictEqual(get(proxy, 'foo'), 'FOO');
    }

    [`@test JSON.stringify doens't assert`](assert) {
      let proxy = ObjectProxy.create({
        content: {
          foo: 'FOO',
        },
      });

      assert.strictEqual(JSON.stringify(proxy), JSON.stringify({ content: { foo: 'FOO' } }));
    }

    ['@test calling a function on the proxy avoids the assertion'](assert) {
      if (DEBUG) {
        let proxy = ObjectProxy.extend({
          init() {
            if (!this.foobar) {
              this.foobar = function () {
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

        assert.strictEqual(proxy.foobar(), 'xoxo', 'should be able to use a function from a proxy');
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

      assert.strictEqual(JSON.stringify(proxy), JSON.stringify({ content: 'hello' }));
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

      assert.strictEqual(JSON.stringify(proxy), JSON.stringify({ content: 'hello' }));
    }

    ['@test getting proxied properties with [] should be an error'](assert) {
      if (DEBUG) {
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

    async ['@test should work with watched properties'](assert) {
      let content1 = { firstName: 'Tom', lastName: 'Dale' };
      let content2 = { firstName: 'Yehuda', lastName: 'Katz' };
      let count = 0;
      let last;

      let Proxy = ObjectProxy.extend({
        fullName: computed('firstName', 'lastName', function () {
          let firstName = this.get('firstName');
          let lastName = this.get('lastName');

          if (firstName && lastName) {
            return firstName + ' ' + lastName;
          }
          return firstName || lastName;
        }),
      });

      let proxy = Proxy.create();

      addObserver(proxy, 'fullName', () => {
        last = get(proxy, 'fullName');
      });

      // We need separate observers for each property for async observers
      addObserver(proxy, 'firstName', function () {
        count++;
      });

      addObserver(proxy, 'lastName', function () {
        count++;
      });

      // proxy without content returns undefined
      assert.strictEqual(get(proxy, 'fullName'), undefined);

      // setting content causes all watched properties to change
      set(proxy, 'content', content1);
      await runLoopSettled();

      // both dependent keys changed
      assert.strictEqual(count, 2);
      assert.strictEqual(last, 'Tom Dale');

      // setting property in content causes proxy property to change
      set(content1, 'lastName', 'Huda');
      await runLoopSettled();

      assert.strictEqual(count, 3);
      assert.strictEqual(last, 'Tom Huda');

      // replacing content causes all watched properties to change
      set(proxy, 'content', content2);
      await runLoopSettled();

      // both dependent keys changed
      assert.strictEqual(count, 5);
      assert.strictEqual(last, 'Yehuda Katz');

      // setting property in new content
      set(content2, 'firstName', 'Tomhuda');
      await runLoopSettled();

      assert.strictEqual(last, 'Tomhuda Katz');
      assert.strictEqual(count, 6);

      // setting property in proxy syncs with new content
      set(proxy, 'lastName', 'Katzdale');
      await runLoopSettled();

      assert.strictEqual(count, 7);
      assert.strictEqual(last, 'Tomhuda Katzdale');
      assert.strictEqual(get(content2, 'firstName'), 'Tomhuda');
      assert.strictEqual(get(content2, 'lastName'), 'Katzdale');

      proxy.destroy();
    }

    async ['@test set and get should work with paths'](assert) {
      let content = { foo: { bar: 'baz' } };
      let proxy = ObjectProxy.create({ content });
      let count = 0;

      proxy.set('foo.bar', 'hello');
      assert.strictEqual(proxy.get('foo.bar'), 'hello');
      assert.strictEqual(proxy.get('content.foo.bar'), 'hello');

      proxy.addObserver('foo.bar', function () {
        count++;
      });

      proxy.set('foo.bar', 'bye');
      await runLoopSettled();

      assert.strictEqual(count, 1);
      assert.strictEqual(proxy.get('foo.bar'), 'bye');
      assert.strictEqual(proxy.get('content.foo.bar'), 'bye');

      proxy.destroy();
    }

    async ['@test should transition between watched and unwatched strategies'](assert) {
      let content = { foo: 'foo' };
      let proxy = ObjectProxy.create({ content: content });
      let count = 0;

      function observer() {
        count++;
      }

      assert.strictEqual(get(proxy, 'foo'), 'foo');

      set(content, 'foo', 'bar');

      assert.strictEqual(get(proxy, 'foo'), 'bar');

      set(proxy, 'foo', 'foo');

      assert.strictEqual(get(content, 'foo'), 'foo');
      assert.strictEqual(get(proxy, 'foo'), 'foo');

      addObserver(proxy, 'foo', observer);

      assert.strictEqual(count, 0);
      assert.strictEqual(get(proxy, 'foo'), 'foo');

      set(content, 'foo', 'bar');
      await runLoopSettled();

      assert.strictEqual(count, 1);
      assert.strictEqual(get(proxy, 'foo'), 'bar');

      set(proxy, 'foo', 'foo');
      await runLoopSettled();

      assert.strictEqual(count, 2);
      assert.strictEqual(get(content, 'foo'), 'foo');
      assert.strictEqual(get(proxy, 'foo'), 'foo');

      removeObserver(proxy, 'foo', observer);

      set(content, 'foo', 'bar');

      assert.strictEqual(get(proxy, 'foo'), 'bar');

      set(proxy, 'foo', 'foo');

      assert.strictEqual(get(content, 'foo'), 'foo');
      assert.strictEqual(get(proxy, 'foo'), 'foo');
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
      assert.strictEqual(
        get(proxyObject, 'prop'),
        undefined,
        'sets the `undefined` value to the proxied content'
      );
    }

    ['@test should not throw or deprecate when adding an observer to an ObjectProxy based class'](
      assert
    ) {
      assert.expect(0);

      let obj = ObjectProxy.extend({
        observe: observer('foo', function () {}),
      }).create();

      obj.destroy();
    }

    async '@test custom proxies should be able to notify property changes manually'(assert) {
      let proxy = ObjectProxy.extend({
        locals: { foo: 123 },

        unknownProperty(key) {
          return this.locals[key];
        },

        setUnknownProperty(key, value) {
          this.locals[key] = value;
          this.notifyPropertyChange(key);
        },
      }).create();

      let count = 0;

      proxy.addObserver('foo', function () {
        count++;
      });

      proxy.set('foo', 456);
      await runLoopSettled();

      assert.strictEqual(count, 1);
      assert.strictEqual(proxy.get('foo'), 456);
      assert.strictEqual(proxy.get('locals.foo'), 456);

      proxy.destroy();
    }
  }
);
