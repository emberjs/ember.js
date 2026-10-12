import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { defer } from 'rsvp';
import { setupApplicationTest, setupRenderingTest } from 'ember-qunit';
import { currentRouteName, find, render, settled, visit } from '@ember/test-helpers';
import Controller from '@ember/controller';
import { associateDestroyableChild } from '@ember/destroyable';
import Engine from '@ember/engine';
import { hash } from '@ember/helper';
import { renderComponent, renderSettled } from '@ember/renderer';
import { LinkTo, isLoading } from '@ember/routing';
import Route from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import { ModuleBasedTestResolver } from 'internal-test-helpers';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('about');
  this.route('slow');
  this.route('search');
  this.route('post', { path: '/posts/:post_id' }, function () {
    this.route('comment', { path: '/comments/:comment_id' });
  });
  this.mount('blog');
});

class SearchController extends Controller {
  queryParams = ['q'];
  q = null;
}

class State {
  @tracked postId = '1';
}

module('Helpers test: {{isLoading}}', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    let model = (this.model = defer());

    /**
      A test registers this class for the route that must stay in the transition.
    */
    let SlowRoute = (this.SlowRoute = class extends Route {
      model() {
        return model.promise;
      }
    });

    this.owner.register('router:main', Router);
    this.owner.register('controller:search', SearchController);
    this.owner.register(
      'engine:blog',
      class extends Engine {
        Resolver = ModuleBasedTestResolver;

        init() {
          super.init(...arguments);
          this.register('route:slow', SlowRoute);
          this.register(
            'template:application',
            <template>
              <span id='blog-slow'>{{isLoading 'slow'}}</span>
              <span id='blog-about'>{{isLoading 'about'}}</span>
              <span id='blog-application'>{{isLoading 'application'}}</span>
            </template>
          );
        }
      }
    );
    this.owner.register('route-map:blog', function () {
      this.route('about');
      this.route('slow');
    });
  });

  test('it returns true while the application visits the route', async function (assert) {
    this.owner.register('route:slow', this.SlowRoute);
    this.owner.register(
      'template:application',
      <template>
        <span id='slow'>{{isLoading 'slow'}}</span>
        <span id='about'>{{isLoading 'about'}}</span>
        <span id='index'>{{isLoading 'index'}}</span>
      </template>
    );

    await visit('/');

    assert.dom('#slow').hasText('false');
    assert.dom('#about').hasText('false');
    assert.dom('#index').hasText('false');

    let visited = visit('/slow');
    await renderSettled();

    assert.strictEqual(currentRouteName(), 'index', 'the transition is not complete');
    assert.dom('#slow').hasText('true');
    assert.dom('#about').hasText('false');
    assert.dom('#index').hasText('false', 'the application leaves this route');

    this.model.resolve();
    await visited;

    assert.strictEqual(currentRouteName(), 'slow');
    assert.dom('#slow').hasText('false');
    assert.dom('#about').hasText('false');
    assert.dom('#index').hasText('false');
  });

  test('it returns true for a parent route of the target route', async function (assert) {
    this.owner.register('route:post.comment', this.SlowRoute);
    this.owner.register(
      'template:application',
      <template>
        <span id='application'>{{isLoading 'application'}}</span>
        <span id='post'>{{isLoading 'post' '1'}}</span>
        <span id='comment'>{{isLoading 'post.comment' '1' '7'}}</span>
      </template>
    );

    await visit('/posts/1');

    assert.dom('#application').hasText('false');
    assert.dom('#post').hasText('false');
    assert.dom('#comment').hasText('false');

    let visited = visit('/posts/1/comments/7');
    await renderSettled();

    assert.dom('#application').hasText('true');
    assert.dom('#post').hasText('true');
    assert.dom('#comment').hasText('true');

    this.model.resolve();
    await visited;

    assert.dom('#application').hasText('false');
    assert.dom('#post').hasText('false');
    assert.dom('#comment').hasText('false');
  });

  test('it returns true in a loading substate', async function (assert) {
    this.owner.register('route:slow', this.SlowRoute);
    this.owner.register('template:loading', <template>Loading</template>);
    this.owner.register(
      'template:application',
      <template>
        <span id='slow'>{{isLoading 'slow'}}</span>
        <span id='about'>{{isLoading 'about'}}</span>
      </template>
    );

    await visit('/');

    let visited = visit('/slow');
    await renderSettled();

    assert.strictEqual(currentRouteName(), 'loading', 'the app is in the loading substate');
    assert.dom('#slow').hasText('true');
    assert.dom('#about').hasText('false');

    this.model.resolve();
    await visited;

    assert.strictEqual(currentRouteName(), 'slow');
    assert.dom('#slow').hasText('false');
  });

  test('it uses the models', async function (assert) {
    this.owner.register('route:post', this.SlowRoute);
    this.owner.register(
      'template:application',
      <template>
        <span id='post'>{{isLoading 'post' '1'}}</span>
        <span id='named'>{{isLoading 'post' models='1'}}</span>
        <span id='named-list'>{{isLoading 'post' models=(Array.of '1')}}</span>
        <span id='other'>{{isLoading 'post' '2'}}</span>
      </template>
    );

    await visit('/');

    assert.dom('#post').hasText('false');

    let visited = visit('/posts/1');
    await renderSettled();

    assert.dom('#post').hasText('true');
    assert.dom('#named').hasText('true');
    assert.dom('#named-list').hasText('true');
    assert.dom('#other').hasText('false');

    this.model.resolve();
    await visited;

    assert.dom('#post').hasText('false');
    assert.dom('#named').hasText('false');
    assert.dom('#named-list').hasText('false');
  });

  test('it uses the query params', async function (assert) {
    this.owner.register('route:search', this.SlowRoute);
    this.owner.register(
      'template:application',
      <template>
        <span id='search'>{{isLoading 'search'}}</span>
        <span id='ember'>{{isLoading 'search' queryParams=(hash q='ember')}}</span>
        <span id='glimmer'>{{isLoading 'search' queryParams=(hash q='glimmer')}}</span>
      </template>
    );

    await visit('/');

    let visited = visit('/search?q=ember');
    await renderSettled();

    assert.dom('#search').hasText('true');
    assert.dom('#ember').hasText('true');
    assert.dom('#glimmer').hasText('false');

    this.model.resolve();
    await visited;

    assert.dom('#search').hasText('false');
    assert.dom('#ember').hasText('false');
  });

  test('it updates when a model changes', async function (assert) {
    let state = new State();

    this.owner.register('route:post', this.SlowRoute);
    this.owner.register(
      'template:application',
      <template>
        <span id='post'>{{isLoading 'post' state.postId}}</span>
      </template>
    );

    await visit('/');

    let visited = visit('/posts/2');
    await renderSettled();

    assert.dom('#post').hasText('false');

    state.postId = '2';
    await renderSettled();

    assert.dom('#post').hasText('true');

    this.model.resolve();
    await visited;

    assert.dom('#post').hasText('false');
  });

  test('it resolves route names from the mount point of the engine', async function (assert) {
    await visit('/blog');

    assert.dom('#blog-slow').hasText('false');
    assert.dom('#blog-about').hasText('false');
    assert.dom('#blog-application').hasText('false');

    let visited = visit('/blog/slow');
    await renderSettled();

    assert.dom('#blog-slow').hasText('true');
    assert.dom('#blog-about').hasText('false');
    assert.dom('#blog-application').hasText('true', 'a parent route of the target route');

    this.model.resolve();
    await visited;

    assert.dom('#blog-slow').hasText('false');
    assert.dom('#blog-application').hasText('false');
  });
});

module('Helpers test: {{isLoading}} arguments', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    let model = (this.model = defer());

    this.SlowRoute = class extends Route {
      model() {
        return model.promise;
      }
    };

    this.owner.register('router:main', Router);
    this.owner.register(
      'engine:blog',
      class extends Engine {
        Resolver = ModuleBasedTestResolver;
      }
    );
    this.owner.register('route-map:blog', function () {});
    this.owner.setupRouter();
  });

  test('it returns false when the route or a model is missing', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:post', this.SlowRoute);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='present'>{{isLoading 'post' '1'}}</span>
        <span id='null'>{{isLoading 'post' null}}</span>
        <span id='undefined'>{{isLoading 'post' undefined}}</span>
        <span id='named'>{{isLoading 'post' models=(Array.of null)}}</span>
        <span id='named-single'>{{isLoading 'post' models=undefined}}</span>
        <span id='route'>{{isLoading null}}</span>
      </template>
    );

    let transition = router.transitionTo('/posts/1');
    await renderSettled();

    assert.dom('#present').hasText('true');
    assert.dom('#null').hasText('false');
    assert.dom('#undefined').hasText('false');
    assert.dom('#named').hasText('false');
    assert.dom('#named-single').hasText('false');
    assert.dom('#route').hasText('false');

    this.model.resolve();
    await transition;
    await settled();
  });

  test('it does not accept positional models together with `models`', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isLoading 'post' '42' models='42'}}</template>),
      /You cannot provide both positional models and the `models` argument to the `isLoading` helper\./
    );
  });

  test('it does not accept a model object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let post = { id: '1' };

    await assert.rejects(
      render(<template>{{isLoading 'post' post}}</template>),
      /The models of the `isLoading` helper must be strings or numbers\. Pass the value of the dynamic segment, not a model object\./
    );
  });

  test('it does not accept a route name that is not a string', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isLoading 42}}</template>),
      /The route name of the `isLoading` helper must be a string\./
    );
  });

  test('it does not accept `queryParams` that is not an object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isLoading 'post' '1' queryParams='q=ember'}}</template>),
      /The `queryParams` argument to the `isLoading` helper must be an object\./
    );
  });

  test('it is not supported in a routeless engine', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let engine = this.owner.buildChildEngineInstance('blog');

    associateDestroyableChild(this.owner, engine);
    await engine.boot();

    await this.owner.lookup('service:router').transitionTo('/');
    await render(
      <template>
        <div id='engine'></div>
      </template>
    );

    assert.throws(
      () =>
        renderComponent(
          <template>{{isLoading 'about'}}</template>,
          { into: find('#engine'), owner: engine }
        ),
      /You attempted to use the `isLoading` helper within a routeless engine, this is not supported\./
    );
  });
});
