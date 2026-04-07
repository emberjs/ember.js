import { module, test } from 'qunit';

import { setupResolver, resolver, loader } from './-setup-resolver';

module('pods lookup structure', function (hooks) {
  hooks.beforeEach(function () {
    setupResolver();
  });

  test('will lookup modulePrefix/name/type before prefix/type/name', function (assert) {
    loader.define('appkit/controllers/foo', [], function () {
      assert.ok(false, 'appkit/controllers was used');
      return 'whatever';
    });

    loader.define('appkit/foo/controller', [], function () {
      assert.ok(true, 'appkit/foo/controllers was used');
      return 'whatever';
    });

    resolver.resolve('controller:foo');
  });

  test('will lookup names with slashes properly', function (assert) {
    loader.define('appkit/controllers/foo/index', [], function () {
      assert.ok(false, 'appkit/controllers was used');
      return 'whatever';
    });

    loader.define('appkit/foo/index/controller', [], function () {
      assert.ok(true, 'appkit/foo/index/controller was used');
      return 'whatever';
    });

    resolver.resolve('controller:foo/index');
  });

  test('specifying a podModulePrefix overrides the general modulePrefix', function (assert) {
    setupResolver({
      namespace: {
        modulePrefix: 'appkit',
        podModulePrefix: 'appkit/pods',
      },
    });

    loader.define('appkit/controllers/foo', [], function () {
      assert.ok(false, 'appkit/controllers was used');
      return 'whatever';
    });

    loader.define('appkit/foo/controller', [], function () {
      assert.ok(false, 'appkit/foo/controllers was used');
      return 'whatever';
    });

    loader.define('appkit/pods/foo/controller', [], function () {
      assert.ok(true, 'appkit/pods/foo/controllers was used');
      return 'whatever';
    });

    resolver.resolve('controller:foo');
  });

  test('will not use custom type prefix when using POD format', function (assert) {
    resolver.namespace['controllerPrefix'] = 'foobar';

    loader.define('foobar/controllers/foo', [], function () {
      assert.ok(false, 'foobar/controllers was used');
      return 'whatever';
    });

    loader.define('foobar/foo/controller', [], function () {
      assert.ok(false, 'foobar/foo/controllers was used');
      return 'whatever';
    });

    loader.define('appkit/foo/controller', [], function () {
      assert.ok(true, 'appkit/foo/controllers was used');
      return 'whatever';
    });

    resolver.resolve('controller:foo');
  });

  test('it will find components nested in app/components/name/index.js', function (assert) {
    loader.define('appkit/components/foo-bar/index', [], function () {
      assert.ok(true, 'appkit/components/foo-bar was used');

      return 'whatever';
    });

    resolver.resolve('component:foo-bar');
  });

  test('will lookup a components template without being rooted in `components/`', function (assert) {
    loader.define('appkit/components/foo-bar/template', [], function () {
      assert.ok(false, 'appkit/components was used');
      return 'whatever';
    });

    loader.define('appkit/foo-bar/template', [], function () {
      assert.ok(true, 'appkit/foo-bar/template was used');
      return 'whatever';
    });

    resolver.resolve('template:components/foo-bar');
  });

  test('will use pods format to lookup components in components/', function (assert) {
    assert.expect(3);

    let expectedComponent = { isComponentFactory: true };
    loader.define('appkit/components/foo-bar/template', [], function () {
      assert.ok(true, 'appkit/components was used');
      return 'whatever';
    });

    loader.define('appkit/components/foo-bar/component', [], function () {
      assert.ok(true, 'appkit/components was used');
      return { default: expectedComponent };
    });

    resolver.resolve('template:components/foo-bar');
    let component = resolver.resolve('component:foo-bar');

    assert.equal(component, expectedComponent, 'default export was returned');
  });

  test('will not lookup routes in components/', function (assert) {
    assert.expect(1);

    loader.define('appkit/components/foo-bar/route', [], function () {
      assert.ok(false, 'appkit/components was used');
      return { isRouteFactory: true };
    });

    loader.define('appkit/routes/foo-bar', [], function () {
      assert.ok(true, 'appkit/routes was used');
      return { isRouteFactory: true };
    });

    resolver.resolve('route:foo-bar');
  });

  test('will not lookup non component templates in components/', function (assert) {
    assert.expect(1);

    loader.define('appkit/components/foo-bar/template', [], function () {
      assert.ok(false, 'appkit/components was used');
      return 'whatever';
    });

    loader.define('appkit/templates/foo-bar', [], function () {
      assert.ok(true, 'appkit/templates was used');
      return 'whatever';
    });

    resolver.resolve('template:foo-bar');
  });

  module('custom pluralization');

  test('will use the pluralization specified for a given type', function (assert) {
    assert.expect(1);

    setupResolver({
      namespace: {
        modulePrefix: 'appkit',
      },

      pluralizedTypes: {
        sheep: 'sheep',
        octipus: 'octipii',
      },
    });

    loader.define('appkit/sheep/baaaaaa', [], function () {
      assert.ok(true, 'custom pluralization used');
      return 'whatever';
    });

    resolver.resolve('sheep:baaaaaa');
  });

  test("will pluralize 'config' as 'config' by default", function (assert) {
    assert.expect(1);

    setupResolver();

    loader.define('appkit/config/environment', [], function () {
      assert.ok(true, 'config/environment is found');
      return 'whatever';
    });

    resolver.resolve('config:environment');
  });

  test("'config' can be overridden", function (assert) {
    assert.expect(1);

    setupResolver({
      namespace: {
        modulePrefix: 'appkit',
      },

      pluralizedTypes: {
        config: 'super-duper-config',
      },
    });

    loader.define('appkit/super-duper-config/environment', [], function () {
      assert.ok(true, 'super-duper-config/environment is found');
      return 'whatever';
    });

    resolver.resolve('config:environment');
  });
});
