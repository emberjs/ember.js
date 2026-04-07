/* eslint-disable no-console */

import { module, test } from 'qunit';
import { setupResolver, resolver, loader } from './-setup-resolver';

let originalConsoleInfo;

module('ember-resolver/resolvers/classic', function (hooks) {
  hooks.beforeEach(function () {
    setupResolver();
  });

  hooks.afterEach(function () {
    if (originalConsoleInfo) {
      console.info = originalConsoleInfo;
    }
  });

  // ember @ 3.3 breaks this: https://github.com/emberjs/ember.js/commit/b8613c20289cc8a730e181c4c51ecfc4b6836052#r29790209
  // ember @ 3.4.0-beta.1 restores this: https://github.com/emberjs/ember.js/commit/ddd8d9b9d9f6d315185a34802618a666bb3aeaac
  // test('does not require `namespace` to exist at `init` time', function(assert) {
  //   assert.expect(0);

  //   Resolver.create({ namespace: '' });
  // });

  test('can lookup something', function (assert) {
    assert.expect(2);

    loader.define('appkit/adapters/post', [], function () {
      assert.ok(true, 'adapter was invoked properly');

      return {};
    });

    var adapter = resolver.resolve('adapter:post');

    assert.ok(adapter, 'adapter was returned');
  });

  test('can lookup something in another namespace', function (assert) {
    assert.expect(3);

    let expected = {};

    loader.define('other/adapters/post', [], function () {
      assert.ok(true, 'adapter was invoked properly');

      return {
        default: expected,
      };
    });

    var adapter = resolver.resolve('other@adapter:post');

    assert.ok(adapter, 'adapter was returned');
    assert.equal(adapter, expected, 'default export was returned');
  });

  test('can lookup something in another namespace with an @ scope', function (assert) {
    assert.expect(3);

    let expected = {};

    loader.define('@scope/other/adapters/post', [], function () {
      assert.ok(true, 'adapter was invoked properly');

      return {
        default: expected,
      };
    });

    var adapter = resolver.resolve('@scope/other@adapter:post');

    assert.ok(adapter, 'adapter was returned');
    assert.equal(adapter, expected, 'default export was returned');
  });

  test('can lookup something with an @ sign', function (assert) {
    assert.expect(3);

    let expected = {};
    loader.define('appkit/helpers/@content-helper', [], function () {
      assert.ok(true, 'helper was invoked properly');

      return { default: expected };
    });

    var helper = resolver.resolve('helper:@content-helper');

    assert.ok(helper, 'helper was returned');
    assert.equal(helper, expected, 'default export was returned');
  });

  test('can lookup something in another namespace with different syntax', function (assert) {
    assert.expect(3);

    let expected = {};
    loader.define('other/adapters/post', [], function () {
      assert.ok(true, 'adapter was invoked properly');

      return { default: expected };
    });

    var adapter = resolver.resolve('adapter:other@post');

    assert.ok(adapter, 'adapter was returned');
    assert.equal(adapter, expected, 'default export was returned');
  });

  test('can lookup something in another namespace with an @ scope with different syntax', function (assert) {
    assert.expect(3);

    let expected = {};
    loader.define('@scope/other/adapters/post', [], function () {
      assert.ok(true, 'adapter was invoked properly');

      return { default: expected };
    });

    var adapter = resolver.resolve('adapter:@scope/other@post');

    assert.ok(adapter, 'adapter was returned');
    assert.equal(adapter, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace', function (assert) {
    assert.expect(3);

    let expected = { isViewFactory: true };
    loader.define('other/views/post', [], function () {
      assert.ok(true, 'view was invoked properly');

      return { default: expected };
    });

    var view = resolver.resolve('other@view:post');

    assert.ok(view, 'view was returned');
    assert.equal(view, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace with an @ scope', function (assert) {
    assert.expect(3);

    let expected = { isViewFactory: true };
    loader.define('@scope/other/views/post', [], function () {
      assert.ok(true, 'view was invoked properly');

      return { default: expected };
    });

    var view = resolver.resolve('@scope/other@view:post');

    assert.ok(view, 'view was returned');
    assert.equal(view, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace with different syntax', function (assert) {
    assert.expect(3);

    let expected = { isViewFactory: true };
    loader.define('other/views/post', [], function () {
      assert.ok(true, 'view was invoked properly');

      return { default: expected };
    });

    var view = resolver.resolve('view:other@post');

    assert.ok(view, 'view was returned');
    assert.equal(view, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace with an @ scope with different syntax', function (assert) {
    assert.expect(3);

    let expected = { isViewFactory: true };
    loader.define('@scope/other/views/post', [], function () {
      assert.ok(true, 'view was invoked properly');

      return { default: expected };
    });

    var view = resolver.resolve('view:@scope/other@post');

    assert.ok(view, 'view was returned');
    assert.equal(view, expected, 'default export was returned');
  });

  test('can lookup a component template in another namespace with different syntax', function (assert) {
    assert.expect(2);

    let expected = { isTemplate: true };
    loader.define('other/templates/components/foo-bar', [], function () {
      assert.ok(true, 'template was looked up properly');

      return { default: expected };
    });

    var template = resolver.resolve('template:components/other@foo-bar');

    assert.equal(template, expected, 'default export was returned');
  });

  test('can lookup a component template in another namespace with an @ scope with different syntax', function (assert) {
    assert.expect(2);

    let expected = { isTemplate: true };
    loader.define('@scope/other/templates/components/foo-bar', [], function () {
      assert.ok(true, 'template was looked up properly');

      return { default: expected };
    });

    var template = resolver.resolve('template:components/@scope/other@foo-bar');

    assert.equal(template, expected, 'default export was returned');
  });

  test('can lookup a view', function (assert) {
    assert.expect(3);

    let expected = { isViewFactory: true };
    loader.define('appkit/views/queue-list', [], function () {
      assert.ok(true, 'view was invoked properly');

      return { default: expected };
    });

    var view = resolver.resolve('view:queue-list');

    assert.ok(view, 'view was returned');
    assert.equal(view, expected, 'default export was returned');
  });

  test('can lookup a helper', function (assert) {
    assert.expect(3);

    let expected = { isHelperInstance: true };
    loader.define('appkit/helpers/reverse-list', [], function () {
      assert.ok(true, 'helper was invoked properly');

      return { default: expected };
    });

    var helper = resolver.resolve('helper:reverse-list');

    assert.ok(helper, 'helper was returned');
    assert.equal(helper, expected, 'default export was returned');
  });

  test('can lookup an engine', function (assert) {
    assert.expect(3);

    let expected = {};
    loader.define('appkit/engine', [], function () {
      assert.ok(true, 'engine was invoked properly');

      return { default: expected };
    });

    let engine = resolver.resolve('engine:appkit');

    assert.ok(engine, 'engine was returned');
    assert.equal(engine, expected, 'default export was returned');
  });

  test('can lookup an engine from a scoped package', function (assert) {
    assert.expect(3);

    let expected = {};
    loader.define('@some-scope/some-module/engine', [], function () {
      assert.ok(true, 'engine was invoked properly');

      return { default: expected };
    });

    var engine = resolver.resolve('engine:@some-scope/some-module');

    assert.ok(engine, 'engine was returned');
    assert.equal(engine, expected, 'default export was returned');
  });

  test('can lookup a route-map', function (assert) {
    assert.expect(3);

    let expected = { isRouteMap: true };
    loader.define('appkit/routes', [], function () {
      assert.ok(true, 'route-map was invoked properly');

      return { default: expected };
    });

    let routeMap = resolver.resolve('route-map:appkit');

    assert.ok(routeMap, 'route-map was returned');
    assert.equal(routeMap, expected, 'default export was returned');
  });

  // the assert.expectWarning helper no longer works
  test.skip('warns if looking up a camelCase helper that has a dasherized module present', function (assert) {
    assert.expect(1);

    loader.define('appkit/helpers/reverse-list', [], function () {
      return { default: { isHelperInstance: true } };
    });

    var helper = resolver.resolve('helper:reverseList');

    assert.ok(!helper, 'no helper was returned');
    // assert.expectWarning('Attempted to lookup "helper:reverseList" which was not found. In previous versions of ember-resolver, a bug would have caused the module at "appkit/helpers/reverse-list" to be returned for this camel case helper name. This has been fixed. Use the dasherized name to resolve the module that would have been returned in previous versions.');
  });

  test('errors if lookup of a route-map does not specify isRouteMap', function (assert) {
    assert.expect(2);

    let expected = { isRouteMap: false };
    loader.define('appkit/routes', [], function () {
      assert.ok(true, 'route-map was invoked properly');

      return { default: expected };
    });

    assert.throws(() => {
      resolver.resolve('route-map:appkit');
    }, /The route map for appkit should be wrapped by 'buildRoutes' before exporting/);
  });

  test("will return the raw value if no 'default' is available", function (assert) {
    loader.define('appkit/fruits/orange', [], function () {
      return 'is awesome';
    });

    assert.equal(
      resolver.resolve('fruit:orange'),
      'is awesome',
      'adapter was returned'
    );
  });

  test("will unwrap the 'default' export automatically", function (assert) {
    loader.define('appkit/fruits/orange', [], function () {
      return { default: 'is awesome' };
    });

    assert.equal(
      resolver.resolve('fruit:orange'),
      'is awesome',
      'adapter was returned'
    );
  });

  test('router:main is hard-coded to prefix/router.js', function (assert) {
    assert.expect(1);

    loader.define('appkit/router', [], function () {
      assert.ok(true, 'router:main was looked up');
      return 'whatever';
    });

    resolver.resolve('router:main');
  });

  test('store:main is looked up as prefix/store', function (assert) {
    assert.expect(1);

    loader.define('appkit/store', [], function () {
      assert.ok(true, 'store:main was looked up');
      return 'whatever';
    });

    resolver.resolve('store:main');
  });

  test('store:posts as prefix/stores/post', function (assert) {
    assert.expect(1);

    loader.define('appkit/stores/post', [], function () {
      assert.ok(true, 'store:post was looked up');
      return 'whatever';
    });

    resolver.resolve('store:post');
  });

  test('will raise error if both dasherized and underscored modules exist', function (assert) {
    loader.define('appkit/big-bands/steve-miller-band', [], function () {
      assert.ok(true, 'dasherized version looked up');
      return 'whatever';
    });

    loader.define('appkit/big_bands/steve_miller_band', [], function () {
      assert.ok(false, 'underscored version looked up');
      return 'whatever';
    });

    try {
      resolver.resolve('big-band:steve-miller-band');
    } catch (e) {
      assert.equal(
        e.message,
        `Ambiguous module names: 'appkit/big-bands/steve-miller-band' and 'appkit/big_bands/steve_miller_band'`,
        'error with a descriptive value is thrown'
      );
    }
  });

  test('will lookup an underscored version of the module name when the dasherized version is not found', function (assert) {
    assert.expect(1);

    loader.define('appkit/big_bands/steve_miller_band', [], function () {
      assert.ok(true, 'underscored version looked up properly');
      return 'whatever';
    });

    resolver.resolve('big-band:steve-miller-band');
  });

  test('it provides eachForType which invokes the callback for each item found', function (assert) {
    function orange() {}
    loader.define('appkit/fruits/orange', [], function () {
      return { default: orange };
    });

    function apple() {}
    loader.define('appkit/fruits/apple', [], function () {
      return { default: apple };
    });

    function other() {}
    loader.define('appkit/stuffs/other', [], function () {
      return { default: other };
    });

    var items = resolver.knownForType('fruit');

    assert.deepEqual(items, {
      'fruit:orange': true,
      'fruit:apple': true,
    });
  });

  test('eachForType can find both pod and non-pod factories', function (assert) {
    function orange() {}
    loader.define('appkit/fruits/orange', [], function () {
      return { default: orange };
    });

    function lemon() {}
    loader.define('appkit/lemon/fruit', [], function () {
      return { default: lemon };
    });

    var items = resolver.knownForType('fruit');

    assert.deepEqual(items, {
      'fruit:orange': true,
      'fruit:lemon': true,
    });
  });

  test('if shouldWrapInClassFactory returns true a wrapped object is returned', function (assert) {
    resolver.shouldWrapInClassFactory = function (defaultExport, parsedName) {
      assert.equal(defaultExport, 'foo');
      assert.equal(parsedName.fullName, 'string:foo');

      return true;
    };

    loader.define('appkit/strings/foo', [], function () {
      return { default: 'foo' };
    });

    var value = resolver.resolve('string:foo');

    assert.equal(value.create(), 'foo');
  });

  test('normalization', function (assert) {
    assert.ok(resolver.normalize, 'resolver#normalize is present');

    assert.equal(resolver.normalize('foo:bar'), 'foo:bar');

    assert.equal(resolver.normalize('controller:posts'), 'controller:posts');
    assert.equal(
      resolver.normalize('controller:posts_index'),
      'controller:posts-index'
    );
    assert.equal(
      resolver.normalize('controller:posts.index'),
      'controller:posts/index'
    );
    assert.equal(
      resolver.normalize('controller:posts-index'),
      'controller:posts-index'
    );
    assert.equal(
      resolver.normalize('controller:posts.post.index'),
      'controller:posts/post/index'
    );
    assert.equal(
      resolver.normalize('controller:posts_post.index'),
      'controller:posts-post/index'
    );
    assert.equal(
      resolver.normalize('controller:posts.post_index'),
      'controller:posts/post-index'
    );
    assert.equal(
      resolver.normalize('controller:posts.post-index'),
      'controller:posts/post-index'
    );
    assert.equal(
      resolver.normalize('controller:postsIndex'),
      'controller:posts-index'
    );
    assert.equal(
      resolver.normalize('controller:blogPosts.index'),
      'controller:blog-posts/index'
    );
    assert.equal(
      resolver.normalize('controller:blog/posts.index'),
      'controller:blog/posts/index'
    );
    assert.equal(
      resolver.normalize('controller:blog/posts-index'),
      'controller:blog/posts-index'
    );
    assert.equal(
      resolver.normalize('controller:blog/posts.post.index'),
      'controller:blog/posts/post/index'
    );
    assert.equal(
      resolver.normalize('controller:blog/posts_post.index'),
      'controller:blog/posts-post/index'
    );
    assert.equal(
      resolver.normalize('controller:blog/posts_post-index'),
      'controller:blog/posts-post-index'
    );

    assert.equal(
      resolver.normalize('template:blog/posts_index'),
      'template:blog/posts-index'
    );
    assert.equal(resolver.normalize('service:userAuth'), 'service:user-auth');

    // For helpers, we have special logic to avoid the situation of a template's
    // `{{someName}}` being surprisingly shadowed by a `some-name` helper
    assert.equal(
      resolver.normalize('helper:make-fabulous'),
      'helper:make-fabulous'
    );
    assert.equal(resolver.normalize('helper:fabulize'), 'helper:fabulize');
    assert.equal(
      resolver.normalize('helper:make_fabulous'),
      'helper:make-fabulous'
    );
    assert.equal(
      resolver.normalize('helper:makeFabulous'),
      'helper:makeFabulous'
    );

    // The same applies to components
    assert.equal(
      resolver.normalize('component:fabulous-component'),
      'component:fabulous-component'
    );
    assert.equal(
      resolver.normalize('component:fabulousComponent'),
      'component:fabulousComponent'
    );
    assert.equal(
      resolver.normalize('template:components/fabulousComponent'),
      'template:components/fabulousComponent'
    );

    // and modifiers
    assert.equal(
      resolver.normalize('modifier:fabulous-component'),
      'modifier:fabulous-component'
    );

    // deprecated when fabulously-missing actually exists, but normalize still returns it
    assert.equal(
      resolver.normalize('modifier:fabulouslyMissing'),
      'modifier:fabulouslyMissing'
    );
  });

  test('camel case modifier is not normalized', function (assert) {
    assert.expect(2);

    let expected = {};
    loader.define('appkit/modifiers/other-thing', [], function () {
      assert.ok(false, 'appkit/modifiers/other-thing was accessed');

      return { default: 'oh no' };
    });

    loader.define('appkit/modifiers/otherThing', [], function () {
      assert.ok(true, 'appkit/modifiers/otherThing was accessed');

      return { default: expected };
    });

    let modifier = resolver.resolve('modifier:otherThing');

    assert.strictEqual(modifier, expected);
  });

  test('normalization is idempotent', function (assert) {
    let examples = [
      'controller:posts',
      'controller:posts.post.index',
      'controller:blog/posts.post_index',
      'template:foo_bar',
    ];

    examples.forEach((example) => {
      assert.equal(
        resolver.normalize(resolver.normalize(example)),
        resolver.normalize(example)
      );
    });
  });
});
