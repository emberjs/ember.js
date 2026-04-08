import { module, test } from 'qunit';
import { setupResolver, resolver, modules } from './-setup-resolver';

module('strict-resolver | basic', function (hooks) {
  hooks.beforeEach(function () {
    setupResolver();
  });

  test('can lookup something', function (assert) {
    let expected = {};
    modules['appkit/adapters/post'] = { default: expected };

    let adapter = resolver.resolve('adapter:post');

    assert.ok(adapter, 'adapter was returned');
    assert.strictEqual(adapter, expected, 'default export was returned');
  });

  test('can lookup something in another namespace', function (assert) {
    let expected = {};
    modules['other/adapters/post'] = { default: expected };

    let adapter = resolver.resolve('other@adapter:post');

    assert.ok(adapter, 'adapter was returned');
    assert.strictEqual(adapter, expected, 'default export was returned');
  });

  test('can lookup something in another namespace with an @ scope', function (assert) {
    let expected = {};
    modules['@scope/other/adapters/post'] = { default: expected };

    let adapter = resolver.resolve('@scope/other@adapter:post');

    assert.ok(adapter, 'adapter was returned');
    assert.strictEqual(adapter, expected, 'default export was returned');
  });

  test('can lookup something with an @ sign', function (assert) {
    let expected = {};
    modules['appkit/helpers/@content-helper'] = { default: expected };

    let helper = resolver.resolve('helper:@content-helper');

    assert.ok(helper, 'helper was returned');
    assert.strictEqual(helper, expected, 'default export was returned');
  });

  test('can lookup something in another namespace with different syntax', function (assert) {
    let expected = {};
    modules['other/adapters/post'] = { default: expected };

    let adapter = resolver.resolve('adapter:other@post');

    assert.ok(adapter, 'adapter was returned');
    assert.strictEqual(adapter, expected, 'default export was returned');
  });

  test('can lookup something in another namespace with an @ scope with different syntax', function (assert) {
    let expected = {};
    modules['@scope/other/adapters/post'] = { default: expected };

    let adapter = resolver.resolve('adapter:@scope/other@post');

    assert.ok(adapter, 'adapter was returned');
    assert.strictEqual(adapter, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace', function (assert) {
    let expected = { isViewFactory: true };
    modules['other/views/post'] = { default: expected };

    let view = resolver.resolve('other@view:post');

    assert.ok(view, 'view was returned');
    assert.strictEqual(view, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace with an @ scope', function (assert) {
    let expected = { isViewFactory: true };
    modules['@scope/other/views/post'] = { default: expected };

    let view = resolver.resolve('@scope/other@view:post');

    assert.ok(view, 'view was returned');
    assert.strictEqual(view, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace with different syntax', function (assert) {
    let expected = { isViewFactory: true };
    modules['other/views/post'] = { default: expected };

    let view = resolver.resolve('view:other@post');

    assert.ok(view, 'view was returned');
    assert.strictEqual(view, expected, 'default export was returned');
  });

  test('can lookup a view in another namespace with an @ scope with different syntax', function (assert) {
    let expected = { isViewFactory: true };
    modules['@scope/other/views/post'] = { default: expected };

    let view = resolver.resolve('view:@scope/other@post');

    assert.ok(view, 'view was returned');
    assert.strictEqual(view, expected, 'default export was returned');
  });

  test('can lookup a component template in another namespace with different syntax', function (assert) {
    let expected = { isTemplate: true };
    modules['other/templates/components/foo-bar'] = { default: expected };

    let template = resolver.resolve('template:components/other@foo-bar');

    assert.strictEqual(template, expected, 'default export was returned');
  });

  test('can lookup a component template in another namespace with an @ scope with different syntax', function (assert) {
    let expected = { isTemplate: true };
    modules['@scope/other/templates/components/foo-bar'] = {
      default: expected,
    };

    let template = resolver.resolve('template:components/@scope/other@foo-bar');

    assert.strictEqual(template, expected, 'default export was returned');
  });

  test('can lookup a view', function (assert) {
    let expected = { isViewFactory: true };
    modules['appkit/views/queue-list'] = { default: expected };

    let view = resolver.resolve('view:queue-list');

    assert.ok(view, 'view was returned');
    assert.strictEqual(view, expected, 'default export was returned');
  });

  test('can lookup a helper', function (assert) {
    let expected = { isHelperInstance: true };
    modules['appkit/helpers/reverse-list'] = { default: expected };

    let helper = resolver.resolve('helper:reverse-list');

    assert.ok(helper, 'helper was returned');
    assert.strictEqual(helper, expected, 'default export was returned');
  });

  test('can lookup an engine', function (assert) {
    let expected = {};
    modules['appkit/engine'] = { default: expected };

    let engine = resolver.resolve('engine:appkit');

    assert.ok(engine, 'engine was returned');
    assert.strictEqual(engine, expected, 'default export was returned');
  });

  test('can lookup an engine from a scoped package', function (assert) {
    let expected = {};
    modules['@some-scope/some-module/engine'] = { default: expected };

    let engine = resolver.resolve('engine:@some-scope/some-module');

    assert.ok(engine, 'engine was returned');
    assert.strictEqual(engine, expected, 'default export was returned');
  });

  test('can lookup a route-map', function (assert) {
    let expected = { isRouteMap: true };
    modules['appkit/routes'] = { default: expected };

    let routeMap = resolver.resolve('route-map:appkit');

    assert.ok(routeMap, 'route-map was returned');
    assert.strictEqual(routeMap, expected, 'default export was returned');
  });

  test('errors if lookup of a route-map does not specify isRouteMap', function (assert) {
    modules['appkit/routes'] = { default: { isRouteMap: false } };

    assert.throws(() => {
      resolver.resolve('route-map:appkit');
    }, /The route map for appkit should be wrapped by 'buildRoutes' before exporting/);
  });

  test("will return the raw value if no 'default' is available", function (assert) {
    modules['appkit/fruits/orange'] = 'is awesome';

    assert.strictEqual(
      resolver.resolve('fruit:orange'),
      'is awesome',
      'raw value was returned'
    );
  });

  test("will unwrap the 'default' export automatically", function (assert) {
    modules['appkit/fruits/orange'] = { default: 'is awesome' };

    assert.strictEqual(
      resolver.resolve('fruit:orange'),
      'is awesome',
      'default export was unwrapped'
    );
  });

  test('router:main is hard-coded to prefix/router.js', function (assert) {
    modules['appkit/router'] = 'whatever';

    let result = resolver.resolve('router:main');

    assert.strictEqual(result, 'whatever', 'router:main was looked up');
  });

  test('store:main is looked up as prefix/store', function (assert) {
    modules['appkit/store'] = 'whatever';

    let result = resolver.resolve('store:main');

    assert.strictEqual(result, 'whatever', 'store:main was looked up');
  });

  test('store:posts as prefix/stores/post', function (assert) {
    modules['appkit/stores/post'] = 'whatever';

    let result = resolver.resolve('store:post');

    assert.strictEqual(result, 'whatever', 'store:post was looked up');
  });

  test('will raise error if both dasherized and underscored modules exist', function (assert) {
    modules['appkit/big-bands/steve-miller-band'] = 'whatever';
    modules['appkit/big_bands/steve_miller_band'] = 'whatever';

    assert.throws(
      () => resolver.resolve('big-band:steve-miller-band'),
      (e) =>
        e.message ===
        `Ambiguous module names: 'appkit/big-bands/steve-miller-band' and 'appkit/big_bands/steve_miller_band'`,
      'error with a descriptive value is thrown'
    );
  });

  test('will lookup an underscored version of the module name when the dasherized version is not found', function (assert) {
    modules['appkit/big_bands/steve_miller_band'] = 'whatever';

    let result = resolver.resolve('big-band:steve-miller-band');

    assert.strictEqual(
      result,
      'whatever',
      'underscored version looked up properly'
    );
  });

  test('knownForType returns known modules for a given type', function (assert) {
    modules['appkit/fruits/orange'] = { default: function orange() {} };
    modules['appkit/fruits/apple'] = { default: function apple() {} };
    modules['appkit/stuffs/other'] = { default: function other() {} };

    let items = resolver.knownForType('fruit');

    assert.deepEqual(items, {
      'fruit:orange': true,
      'fruit:apple': true,
    });
  });

  test('knownForType can find both pod and non-pod factories', function (assert) {
    modules['appkit/fruits/orange'] = { default: function orange() {} };
    modules['appkit/lemon/fruit'] = { default: function lemon() {} };

    let items = resolver.knownForType('fruit');

    assert.deepEqual(items, {
      'fruit:orange': true,
      'fruit:lemon': true,
    });
  });

  test('if shouldWrapInClassFactory returns true a wrapped object is returned', function (assert) {
    resolver.shouldWrapInClassFactory = function (defaultExport, parsedName) {
      assert.strictEqual(defaultExport, 'foo');
      assert.strictEqual(parsedName.fullName, 'string:foo');

      return true;
    };

    modules['appkit/strings/foo'] = { default: 'foo' };

    let value = resolver.resolve('string:foo');

    assert.strictEqual(value.create(), 'foo');
  });

  test('normalization', function (assert) {
    assert.ok(resolver.normalize, 'resolver#normalize is present');

    assert.strictEqual(resolver.normalize('foo:bar'), 'foo:bar');

    assert.strictEqual(
      resolver.normalize('controller:posts'),
      'controller:posts'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts_index'),
      'controller:posts-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts.index'),
      'controller:posts/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts-index'),
      'controller:posts-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts.post.index'),
      'controller:posts/post/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts_post.index'),
      'controller:posts-post/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts.post_index'),
      'controller:posts/post-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts.post-index'),
      'controller:posts/post-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:postsIndex'),
      'controller:posts-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:blogPosts.index'),
      'controller:blog-posts/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:blog/posts.index'),
      'controller:blog/posts/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:blog/posts-index'),
      'controller:blog/posts-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:blog/posts.post.index'),
      'controller:blog/posts/post/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:blog/posts_post.index'),
      'controller:blog/posts-post/index'
    );
    assert.strictEqual(
      resolver.normalize('controller:blog/posts_post-index'),
      'controller:blog/posts-post-index'
    );

    assert.strictEqual(
      resolver.normalize('template:blog/posts_index'),
      'template:blog/posts-index'
    );
    assert.strictEqual(
      resolver.normalize('service:userAuth'),
      'service:user-auth'
    );

    // For helpers, we have special logic to avoid the situation of a template's
    // `{{someName}}` being surprisingly shadowed by a `some-name` helper
    assert.strictEqual(
      resolver.normalize('helper:make-fabulous'),
      'helper:make-fabulous'
    );
    assert.strictEqual(
      resolver.normalize('helper:fabulize'),
      'helper:fabulize'
    );
    assert.strictEqual(
      resolver.normalize('helper:make_fabulous'),
      'helper:make-fabulous'
    );
    assert.strictEqual(
      resolver.normalize('helper:makeFabulous'),
      'helper:makeFabulous'
    );

    // The same applies to components
    assert.strictEqual(
      resolver.normalize('component:fabulous-component'),
      'component:fabulous-component'
    );
    assert.strictEqual(
      resolver.normalize('component:fabulousComponent'),
      'component:fabulousComponent'
    );
    assert.strictEqual(
      resolver.normalize('template:components/fabulousComponent'),
      'template:components/fabulousComponent'
    );

    // and modifiers
    assert.strictEqual(
      resolver.normalize('modifier:fabulous-component'),
      'modifier:fabulous-component'
    );

    // deprecated when fabulously-missing actually exists, but normalize still returns it
    assert.strictEqual(
      resolver.normalize('modifier:fabulouslyMissing'),
      'modifier:fabulouslyMissing'
    );
  });

  test('camel case modifier is not normalized', function (assert) {
    let expected = {};
    modules['appkit/modifiers/other-thing'] = { default: 'oh no' };
    modules['appkit/modifiers/otherThing'] = { default: expected };

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
      assert.strictEqual(
        resolver.normalize(resolver.normalize(example)),
        resolver.normalize(example)
      );
    });
  });
});
