import {
  addObserver,
  computed,
  get,
  isWatching,
  removeObserver
} from 'ember-metal';
import { HAS_NATIVE_PROXY } from 'ember-utils';
import { testBoth } from 'internal-test-helpers';
import { MANDATORY_GETTER, EMBER_METAL_ES5_GETTERS } from 'ember/features';
import ObjectProxy from '../../system/object_proxy';

QUnit.module('ObjectProxy');

testBoth('should not proxy properties passed to create', function(
  get,
  set,
  assert
) {
  let Proxy = ObjectProxy.extend({
    cp: computed({
      get() {
        return this._cp;
      },
      set(key, value) {
        this._cp = value;
        return this._cp;
      }
    })
  });
  let proxy = Proxy.create({
    prop: 'Foo',
    cp: 'Bar'
  });

  assert.equal(get(proxy, 'prop'), 'Foo', 'should not have tried to proxy set');
  assert.equal(proxy._cp, 'Bar', 'should use CP setter');
});

testBoth('should proxy properties to content', function(get, set, assert) {
  let content = {
    firstName: 'Tom',
    lastName: 'Dale',
    unknownProperty(key) {
      return key + ' unknown';
    }
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
  assert.equal(
    get(proxy, 'lastName'),
    'Huda',
    'proxy should have new value from set on proxy'
  );

  set(proxy, 'content', { firstName: 'Yehuda', lastName: 'Katz' });

  assert.equal(
    get(proxy, 'firstName'),
    'Yehuda',
    'proxy should reflect updated content'
  );
  assert.equal(
    get(proxy, 'lastName'),
    'Katz',
    'proxy should reflect updated content'
  );
});

QUnit.test('getting proxied properties with Ember.get should work', assert => {
  let proxy = ObjectProxy.create({
    content: {
      foo: 'FOO'
    }
  });

  assert.equal(get(proxy, 'foo'), 'FOO');
});

QUnit.test(`JSON.stringify doens't assert`, assert => {
  let proxy = ObjectProxy.create({
    content: {
      foo: 'FOO'
    }
  });

  assert.equal(
    JSON.stringify(proxy),
    JSON.stringify({ content: { foo: 'FOO' } })
  );
});

QUnit.test(`setting a property on the proxy avoids the assertion`, assert => {
  let proxy = ObjectProxy.create({
    toJSON: undefined,
    content: {
      toJSON() {
        return 'hello';
      }
    }
  });

  assert.equal(JSON.stringify(proxy), JSON.stringify({ content: 'hello' }));
});

QUnit.test(
  `setting a property on the proxy's prototype avoids the assertion`,
  assert => {
    let proxy = ObjectProxy.extend({
      toJSON: null
    }).create({
      content: {
        toJSON() {
          return 'hello';
        }
      }
    });

    assert.equal(JSON.stringify(proxy), JSON.stringify({ content: 'hello' }));
  }
);

if (MANDATORY_GETTER && EMBER_METAL_ES5_GETTERS && HAS_NATIVE_PROXY) {
  QUnit.test('getting proxied properties with [] should be an error', () => {
    let proxy = ObjectProxy.create({
      content: {
        foo: 'FOO'
      }
    });

    expectAssertion(() => proxy.foo, /\.get\('foo'\)/);
  });
}

testBoth('should work with watched properties', function(get, set, assert) {
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
    }).property('firstName', 'lastName')
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
});

QUnit.test('set and get should work with paths', function(assert) {
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
});

testBoth('should transition between watched and unwatched strategies', function(
  get,
  set,
  assert
) {
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
});

testBoth(
  'setting `undefined` to a proxied content property should override its existing value',
  function(get, set, assert) {
    let proxyObject = ObjectProxy.create({
      content: {
        prop: 'emberjs'
      }
    });
    set(proxyObject, 'prop', undefined);
    assert.equal(
      get(proxyObject, 'prop'),
      undefined,
      'sets the `undefined` value to the proxied content'
    );
  }
);
