import { module, test } from 'qunit';
import { StrictResolver } from '@ember/engine/lib/strict-resolver';
import { setupResolver } from './-setup-resolver';

module('strict-resolver | basic', function (hooks) {
  let resolver;
  let modules;

  hooks.beforeEach(function () {
    ({ resolver, modules } = setupResolver());
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

  test('can lookup a component', function (assert) {
    let expected = { isComponentFactory: true };
    modules['./components/my-widget'] = { default: expected };
    resolver.addModules(modules);

    let component = resolver.resolve('component:my-widget');

    assert.ok(component, 'component was returned');
    assert.strictEqual(component, expected, 'default export was returned');
  });

  test('can lookup a modifier', function (assert) {
    let expected = { isModifier: true };
    modules['./modifiers/auto-focus'] = { default: expected };
    resolver.addModules(modules);

    let modifier = resolver.resolve('modifier:auto-focus');

    assert.ok(modifier, 'modifier was returned');
    assert.strictEqual(modifier, expected, 'default export was returned');
  });

  test('can lookup a template', function (assert) {
    let expected = { isTemplate: true };
    modules['./templates/application'] = { default: expected };
    resolver.addModules(modules);

    let template = resolver.resolve('template:application');

    assert.ok(template, 'template was returned');
    assert.strictEqual(template, expected, 'default export was returned');
  });

  test('can lookup a view', function (assert) {
    let expected = { isViewFactory: true };
    modules['./views/queue-list'] = { default: expected };
    resolver.addModules(modules);

    let view = resolver.resolve('view:queue-list');

    assert.ok(view, 'view was returned');
    assert.strictEqual(view, expected, 'default export was returned');
  });

  test('can lookup a route', function (assert) {
    let expected = { isRouteFactory: true };
    modules['./routes/index'] = { default: expected };
    resolver.addModules(modules);

    let route = resolver.resolve('route:index');

    assert.ok(route, 'route was returned');
    assert.strictEqual(route, expected, 'default export was returned');
  });

  test('can lookup a controller', function (assert) {
    let expected = { isController: true };
    modules['./controllers/application'] = { default: expected };
    resolver.addModules(modules);

    let controller = resolver.resolve('controller:application');

    assert.ok(controller, 'controller was returned');
    assert.strictEqual(controller, expected, 'default export was returned');
  });

  test("will return the raw value if no 'default' is available", function (assert) {
    modules['./fruits/orange'] = 'is awesome';
    resolver.addModules(modules);

    assert.strictEqual(resolver.resolve('fruit:orange'), 'is awesome', 'raw value was returned');
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

    assert.strictEqual(resolver2.resolve('service:foo'), 'from-ts', 'file extension was stripped');
  });

  test('shorthand module registration (no default wrapper)', function (assert) {
    let MyService = {
      create() {
        return this;
      },
    };

    let resolver2 = new StrictResolver({
      './services/my-thing': MyService,
    });

    let result = resolver2.resolve('service:my-thing');

    assert.strictEqual(result, MyService, 'shorthand module was resolved');
  });

  test('normalization', function (assert) {
    assert.strictEqual(resolver.normalize('controller:posts'), 'controller:posts');
    assert.strictEqual(resolver.normalize('controller:postsIndex'), 'controller:posts-index');
    assert.strictEqual(resolver.normalize('controller:posts.index'), 'controller:posts/index');
    assert.strictEqual(resolver.normalize('controller:posts_index'), 'controller:posts-index');
    assert.strictEqual(resolver.normalize('controller:posts-index'), 'controller:posts-index');
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
    assert.strictEqual(resolver.normalize('service:userAuth'), 'service:user-auth');

    // For helpers, we have special logic to avoid the situation of a template's
    // `{{someName}}` being surprisingly shadowed by a `some-name` helper
    assert.strictEqual(resolver.normalize('helper:make-fabulous'), 'helper:make-fabulous');
    assert.strictEqual(resolver.normalize('helper:fabulize'), 'helper:fabulize');
    assert.strictEqual(resolver.normalize('helper:make_fabulous'), 'helper:make-fabulous');
    assert.strictEqual(resolver.normalize('helper:makeFabulous'), 'helper:makeFabulous');

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
    assert.strictEqual(
      resolver.normalize('modifier:fabulouslyMissing'),
      'modifier:fabulouslyMissing'
    );
  });

  test('camel case modifier is not normalized to dasherized', function (assert) {
    let expected = {};
    resolver.addModules({
      './modifiers/other-thing': { default: 'oh no' },
      './modifiers/otherThing': { default: expected },
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
    let resolver2 = new StrictResolver({ './sheep/baaaaaa': 'whatever' }, { sheep: 'sheep' });

    let result = resolver2.resolve('sheep:baaaaaa');

    assert.strictEqual(result, 'whatever', 'custom plural was used');
  });

  test("'config' plural can be overridden", function (assert) {
    let resolver2 = new StrictResolver(
      { './super-duper-config/environment': 'whatever' },
      { config: 'super-duper-config' }
    );

    let result = resolver2.resolve('config:environment');

    assert.strictEqual(result, 'whatever', 'super-duper-config/environment is found');
  });

  test('default plural handles -s / -ss / -sh / -ch / -x / -z suffixes', function (assert) {
    let cases = {
      './buses/red': 'bus:red',
      './brushes/broom': 'brush:broom',
      './benches/park': 'bench:park',
      './boxes/cardboard': 'box:cardboard',
      './buzzes/loud': 'buzz:loud',
      './classes/math': 'class:math',
    };

    for (let [modulePath, lookup] of Object.entries(cases)) {
      let r = new StrictResolver({ [modulePath]: modulePath });
      assert.strictEqual(r.resolve(lookup), modulePath, `${lookup} -> ${modulePath}`);
    }
  });

  test('default plural handles consonant + y suffix (y -> ies)', function (assert) {
    let r = new StrictResolver({ './categories/widgets': 'widgets-cat' });

    assert.strictEqual(r.resolve('category:widgets'), 'widgets-cat');
  });

  test('default plural handles common irregular nouns', function (assert) {
    let cases = {
      './children/alice': 'child:alice',
      './people/bob': 'person:bob',
      './men/carl': 'man:carl',
      './women/dana': 'woman:dana',
      './mice/squeaky': 'mouse:squeaky',
      './teeth/molar': 'tooth:molar',
      './feet/left': 'foot:left',
    };

    for (let [modulePath, lookup] of Object.entries(cases)) {
      let r = new StrictResolver({ [modulePath]: modulePath });
      assert.strictEqual(r.resolve(lookup), modulePath, `${lookup} -> ${modulePath}`);
    }
  });

  test('custom plural overrides irregular default', function (assert) {
    // a user who insists on "childs" should be able to opt out of the
    // built-in irregular plural
    let r = new StrictResolver({ './childs/alice': 'alice' }, { child: 'childs' });

    assert.strictEqual(r.resolve('child:alice'), 'alice');
  });

  test('can lookup a nested-colocation component (index file)', function (assert) {
    let expected = { isComponentFactory: true };
    resolver.addModules({
      './components/my-widget/index': { default: expected },
    });

    assert.strictEqual(resolver.resolve('component:my-widget'), expected);
  });

  test('nested-colocation also works for helpers and modifiers', function (assert) {
    let helper = {};
    let modifier = {};
    resolver.addModules({
      './helpers/format-date/index': { default: helper },
      './modifiers/on-intersect/index': { default: modifier },
    });

    assert.strictEqual(resolver.resolve('helper:format-date'), helper);
    assert.strictEqual(resolver.resolve('modifier:on-intersect'), modifier);
  });

  test('direct module takes precedence over the nested-colocation index', function (assert) {
    let direct = { direct: true };
    let nested = { nested: true };
    resolver.addModules({
      './components/my-widget': { default: direct },
      './components/my-widget/index': { default: nested },
    });

    assert.strictEqual(
      resolver.resolve('component:my-widget'),
      direct,
      'direct match wins over the colocation fallback'
    );
  });
});
