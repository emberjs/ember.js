import { module, test } from 'qunit';
import { StrictResolver } from '@ember/engine/lib/strict-resolver';

module('StrictResolver', function (hooks) {
  let resolver;
  let modules;

  hooks.beforeEach(function () {
    modules = {};
    resolver = new StrictResolver(modules);
  });

  module('#resolve + #addModules', function () {
    test('resolves the standard ember types via default pluralization', function (assert) {
      // All of these go through the same `type + 's' -> dir` path. One table-
      // driven test keeps the coverage without nine copies of the same setup.
      let cases = [
        { fullName: 'adapter:post', key: './adapters/post' },
        { fullName: 'service:session', key: './services/session' },
        { fullName: 'helper:reverse-list', key: './helpers/reverse-list' },
        { fullName: 'component:my-widget', key: './components/my-widget' },
        { fullName: 'modifier:auto-focus', key: './modifiers/auto-focus' },
        { fullName: 'template:application', key: './templates/application' },
        { fullName: 'view:queue-list', key: './views/queue-list' },
        { fullName: 'route:index', key: './routes/index' },
        { fullName: 'controller:application', key: './controllers/application' },
      ];

      for (let { fullName, key } of cases) {
        let expected = { fullName };
        let longForm = new StrictResolver({ [key]: { default: expected } });
        let shortForm = new StrictResolver({ [key]: expected });

        assert.strictEqual(longForm.resolve(fullName), expected, `${fullName} -> ${key}`);
        assert.strictEqual(shortForm.resolve(fullName), expected, `${fullName} -> ${key}`);
      }
    });

    test('`type:main` resolves to the unpluralized `type` module key', function (assert) {
      // The mainLookup strategy short-circuits pluralization: for any type
      // `type:main` reads the module at the type's bare name.
      resolver.addModules({
        './router': 'the-router',
        './store': 'the-store',
      });

      assert.strictEqual(resolver.resolve('router:main'), 'the-router');
      assert.strictEqual(resolver.resolve('store:main'), 'the-store');
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
  });

  module('#addModules + normalization', function () {
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

    test('addModules allows adding modules after construction', function (assert) {
      let expected = {};

      resolver.addModules({
        './components/hello': { default: expected },
      });

      let component = resolver.resolve('component:hello');

      assert.strictEqual(component, expected, 'component was resolved');
    });
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

  module('weird scenarios', function () {
    test('shorthand class with a falsy or missing `default` falls back to the class itself', function (assert) {
      // `.default` being falsy (undefined / null / 0 / '') means the shorthand
      // value is used directly — matching the "if there's a default use it,
      // else use the value" rule from the other direction.
      class ClassWithUndefinedDefault {
        static default = undefined;
        static create() {
          return new this();
        }
      }

      class ClassWithoutDefault {
        static create() {
          return new this();
        }
      }

      let r = new StrictResolver({
        './services/with-undefined-default': ClassWithUndefinedDefault,
        './services/without-default': ClassWithoutDefault,
      });

      assert.strictEqual(
        r.resolve('service:with-undefined-default'),
        ClassWithUndefinedDefault,
        'undefined `.default` is treated as "no default", class is used'
      );
      assert.strictEqual(
        r.resolve('service:without-default'),
        ClassWithoutDefault,
        'class without a `default` property is used as-is'
      );
    });

    test('ES-module-shaped module with extra named exports still unwraps to `default`', function (assert) {
      // A normal `import * as mod from './...'` yields an object whose
      // `default` is the default export plus any named exports. The resolver
      // returns the default; everything else on the namespace object is
      // ignored. Documenting this so authors know the named exports don't
      // leak through.
      let defaultExport = { isDefault: true };
      let registered = {
        default: defaultExport,
        named: 'not used',
        another: 42,
      };

      let resolver2 = new StrictResolver({
        './services/extras': registered,
      });

      assert.strictEqual(resolver2.resolve('service:extras'), defaultExport);
    });

    test('`type:name` falls back to `types/name/index`, but only for comopnents', function (assert) {
      let component = { component: true };
      let helper = { helper: true };
      let modifier = { modifier: true };
      let route = { route: true };
      resolver.addModules({
        './components/my-widget/index': { default: component },
        './helpers/format-date/index': { default: helper },
        './modifiers/on-intersect/index': { default: modifier },
        './routes/some-route/index': { default: route },
      });

      assert.strictEqual(resolver.resolve('component:my-widget'), component);
      assert.strictEqual(resolver.resolve('helper:format-date'), undefined);
      assert.strictEqual(resolver.resolve('modifier:on-intersect'), undefined);
      assert.strictEqual(resolver.resolve('route:some-route'), undefined);
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

  module('pluralization', function () {
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

    test('irregular plurals must be opted into via the plurals option', function (assert) {
      // Default pluralization is naive (type + 's'), matching ember-resolver's
      // behavior. A consumer that wants proper English irregulars registers
      // them up-front via the plurals map.
      let r = new StrictResolver({ './children/alice': 'alice' }, { child: 'children' });

      assert.strictEqual(r.resolve('child:alice'), 'alice');
    });
  });
});
