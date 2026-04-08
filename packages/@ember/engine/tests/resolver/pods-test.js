import { module, test } from 'qunit';

import { setupResolver, resolver, modules } from './-setup-resolver';

module('strict-resolver | pods lookup structure', function (hooks) {
  hooks.beforeEach(function () {
    setupResolver();
  });

  test('will lookup modulePrefix/name/type before prefix/type/name', function (assert) {
    modules['appkit/controllers/foo'] = 'non-pod';
    modules['appkit/foo/controller'] = 'pod';

    let result = resolver.resolve('controller:foo');

    assert.strictEqual(result, 'pod', 'pod layout was used');
  });

  test('will lookup names with slashes properly', function (assert) {
    modules['appkit/controllers/foo/index'] = 'non-pod';
    modules['appkit/foo/index/controller'] = 'pod';

    let result = resolver.resolve('controller:foo/index');

    assert.strictEqual(result, 'pod', 'pod layout was used');
  });

  test('specifying a podModulePrefix overrides the general modulePrefix', function (assert) {
    setupResolver({
      namespace: {
        modulePrefix: 'appkit',
        podModulePrefix: 'appkit/pods',
      },
    });

    modules['appkit/controllers/foo'] = 'non-pod';
    modules['appkit/foo/controller'] = 'non-pod-prefix';
    modules['appkit/pods/foo/controller'] = 'pod-prefix';

    let result = resolver.resolve('controller:foo');

    assert.strictEqual(result, 'pod-prefix', 'podModulePrefix was used');
  });

  test('will not use custom type prefix when using POD format', function (assert) {
    resolver.namespace['controllerPrefix'] = 'foobar';

    modules['foobar/controllers/foo'] = 'custom-prefix-non-pod';
    modules['foobar/foo/controller'] = 'custom-prefix-pod';
    modules['appkit/foo/controller'] = 'default-prefix-pod';

    let result = resolver.resolve('controller:foo');

    assert.strictEqual(
      result,
      'default-prefix-pod',
      'modulePrefix was used for pod layout'
    );
  });

  test('it will find components nested in app/components/name/index.js', function (assert) {
    modules['appkit/components/foo-bar/index'] = 'nested-component';

    let result = resolver.resolve('component:foo-bar');

    assert.strictEqual(
      result,
      'nested-component',
      'nested component was found'
    );
  });

  test('will lookup a components template without being rooted in `components/`', function (assert) {
    modules['appkit/components/foo-bar/template'] = 'in-components';
    modules['appkit/foo-bar/template'] = 'at-root';

    let result = resolver.resolve('template:components/foo-bar');

    assert.strictEqual(
      result,
      'at-root',
      'template was found without components/ root'
    );
  });

  test('will use pods format to lookup components in components/', function (assert) {
    let expectedComponent = { isComponentFactory: true };
    modules['appkit/components/foo-bar/template'] = 'the-template';
    modules['appkit/components/foo-bar/component'] = {
      default: expectedComponent,
    };

    let template = resolver.resolve('template:components/foo-bar');
    let component = resolver.resolve('component:foo-bar');

    assert.ok(template, 'template was resolved');
    assert.strictEqual(
      component,
      expectedComponent,
      'default export was returned'
    );
  });

  test('will not lookup routes in components/', function (assert) {
    modules['appkit/components/foo-bar/route'] = { isRouteFactory: true };
    modules['appkit/routes/foo-bar'] = { isRouteFactory: true };

    let result = resolver.resolve('route:foo-bar');

    assert.strictEqual(
      result,
      modules['appkit/routes/foo-bar'],
      'routes/ was used, not components/'
    );
  });

  test('will not lookup non component templates in components/', function (assert) {
    modules['appkit/components/foo-bar/template'] = 'component-template';
    modules['appkit/templates/foo-bar'] = 'regular-template';

    let result = resolver.resolve('template:foo-bar');

    assert.strictEqual(
      result,
      'regular-template',
      'templates/ was used, not components/'
    );
  });

  module('custom pluralization');

  test('will use the pluralization specified for a given type', function (assert) {
    setupResolver({
      namespace: {
        modulePrefix: 'appkit',
      },
      pluralizedTypes: {
        sheep: 'sheep',
        octipus: 'octipii',
      },
    });

    modules['appkit/sheep/baaaaaa'] = 'whatever';

    let result = resolver.resolve('sheep:baaaaaa');

    assert.strictEqual(result, 'whatever', 'custom pluralization was used');
  });

  test("will pluralize 'config' as 'config' by default", function (assert) {
    setupResolver();

    modules['appkit/config/environment'] = 'whatever';

    let result = resolver.resolve('config:environment');

    assert.strictEqual(result, 'whatever', 'config/environment is found');
  });

  test("'config' can be overridden", function (assert) {
    setupResolver({
      namespace: {
        modulePrefix: 'appkit',
      },
      pluralizedTypes: {
        config: 'super-duper-config',
      },
    });

    modules['appkit/super-duper-config/environment'] = 'whatever';

    let result = resolver.resolve('config:environment');

    assert.strictEqual(
      result,
      'whatever',
      'super-duper-config/environment is found'
    );
  });
});
