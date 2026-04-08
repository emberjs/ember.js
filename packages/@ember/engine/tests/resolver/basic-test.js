import { module, test } from 'qunit';
import { StrictResolver } from '@ember/engine/lib/strict-resolver';
import { setupResolver, resolver, modules } from './-setup-resolver';

module('strict-resolver | basic', function (hooks) {
  hooks.beforeEach(function () {
    setupResolver();
  });

  test('can lookup something', function (assert) {
    let expected = {};
    modules['./adapters/post'] = { default: expected };
    resolver.addModules(modules);

    let adapter = resolver.resolve('adapter:post');

    assert.ok(adapter, 'adapter was returned');
    assert.strictEqual(adapter, expected, 'default export was returned');
  });

  test('can lookup a service', function (assert) {
    let expected = {};
    modules['./services/session'] = { default: expected };
    resolver.addModules(modules);

    let service = resolver.resolve('service:session');

    assert.ok(service, 'service was returned');
    assert.strictEqual(service, expected, 'default export was returned');
  });

  test('can lookup a helper', function (assert) {
    let expected = { isHelperInstance: true };
    modules['./helpers/reverse-list'] = { default: expected };
    resolver.addModules(modules);

    let helper = resolver.resolve('helper:reverse-list');

    assert.ok(helper, 'helper was returned');
    assert.strictEqual(helper, expected, 'default export was returned');
  });

  test("will return the raw value if no 'default' is available", function (assert) {
    modules['./fruits/orange'] = 'is awesome';
    resolver.addModules(modules);

    assert.strictEqual(
      resolver.resolve('fruit:orange'),
      'is awesome',
      'raw value was returned'
    );
  });

  test("will unwrap the 'default' export automatically", function (assert) {
    modules['./fruits/orange'] = { default: 'is awesome' };
    resolver.addModules(modules);

    assert.strictEqual(
      resolver.resolve('fruit:orange'),
      'is awesome',
      'default export was unwrapped'
    );
  });

  test('router:main is looked up as just "router" key', function (assert) {
    modules['./router'] = 'the-router';
    resolver.addModules(modules);

    let result = resolver.resolve('router:main');

    assert.strictEqual(result, 'the-router', 'router:main was looked up');
  });

  test('store:main is looked up as just "store" key', function (assert) {
    modules['./store'] = 'the-store';
    resolver.addModules(modules);

    let result = resolver.resolve('store:main');

    assert.strictEqual(result, 'the-store', 'store:main was looked up');
  });

  test('store:post is looked up as stores/post', function (assert) {
    modules['./stores/post'] = 'whatever';
    resolver.addModules(modules);

    let result = resolver.resolve('store:post');

    assert.strictEqual(result, 'whatever', 'store:post was looked up');
  });

  test('returns undefined for missing modules', function (assert) {
    let result = resolver.resolve('service:nonexistent');

    assert.strictEqual(result, undefined, 'undefined was returned');
  });

  test('can resolve self via resolver:current', function (assert) {
    let self = resolver.resolve('resolver:current');

    assert.ok(self, 'resolver:current returned a factory');
    assert.strictEqual(self.create(), resolver, 'factory creates the resolver');
  });

  test('addModules allows adding modules after construction', function (assert) {
    let expected = {};

    resolver.addModules({
      './components/hello': { default: expected },
    });

    let component = resolver.resolve('component:hello');

    assert.strictEqual(component, expected, 'component was resolved');
  });

  test('module paths with ./ prefix are normalized', function (assert) {
    let resolver2 = new StrictResolver({
      './services/foo': { default: 'from-dot-slash' },
    });

    assert.strictEqual(
      resolver2.resolve('service:foo'),
      'from-dot-slash',
      './ prefix was stripped'
    );
  });

  test('module paths with file extensions are normalized', function (assert) {
    let resolver2 = new StrictResolver({
      './services/foo.ts': { default: 'from-ts' },
    });

    assert.strictEqual(
      resolver2.resolve('service:foo'),
      'from-ts',
      'file extension was stripped'
    );
  });

  test('shorthand module registration (no default wrapper)', function (assert) {
    let MyService = { create() { return this; } };

    let resolver2 = new StrictResolver({
      './services/my-thing': MyService,
    });

    let result = resolver2.resolve('service:my-thing');

    assert.strictEqual(result, MyService, 'shorthand module was resolved');
  });

  test('normalization', function (assert) {
    assert.strictEqual(
      resolver.normalize('controller:posts'),
      'controller:posts'
    );
    assert.strictEqual(
      resolver.normalize('controller:postsIndex'),
      'controller:posts-index'
    );
    assert.strictEqual(
      resolver.normalize('controller:posts.index'),
      'controller:posts/index'
    );
    assert.strictEqual(
      resolver.normalize('service:userAuth'),
      'service:user-auth'
    );

    // helpers preserve camelCase (avoid shadowing template expressions)
    assert.strictEqual(
      resolver.normalize('helper:makeFabulous'),
      'helper:makeFabulous'
    );
    assert.strictEqual(
      resolver.normalize('helper:make_fabulous'),
      'helper:make-fabulous'
    );

    // components preserve camelCase
    assert.strictEqual(
      resolver.normalize('component:fabulousComponent'),
      'component:fabulousComponent'
    );

    // modifiers preserve camelCase
    assert.strictEqual(
      resolver.normalize('modifier:fabulouslyMissing'),
      'modifier:fabulouslyMissing'
    );
  });

  test('normalization is idempotent', function (assert) {
    let examples = [
      'controller:posts',
      'controller:posts.post.index',
      'template:foo_bar',
    ];

    examples.forEach((example) => {
      assert.strictEqual(
        resolver.normalize(resolver.normalize(example)),
        resolver.normalize(example)
      );
    });
  });

  test('config type pluralizes as config by default', function (assert) {
    modules['./config/environment'] = 'env-config';
    resolver.addModules(modules);

    let result = resolver.resolve('config:environment');

    assert.strictEqual(result, 'env-config', 'config/environment is found');
  });

  test('custom plurals are supported', function (assert) {
    let resolver2 = new StrictResolver(
      { './sheep/baaaaaa': 'whatever' },
      { sheep: 'sheep' }
    );

    let result = resolver2.resolve('sheep:baaaaaa');

    assert.strictEqual(result, 'whatever', 'custom plural was used');
  });
});
