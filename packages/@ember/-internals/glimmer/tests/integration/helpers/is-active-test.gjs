import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, render, settled } from '@ember/test-helpers';
import Controller from '@ember/controller';
import { associateDestroyableChild } from '@ember/destroyable';
import Engine from '@ember/engine';
import { hash } from '@ember/helper';
import { renderComponent, renderSettled } from '@ember/renderer';
import { LinkTo, isActive } from '@ember/routing';
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

class RouterWithRootURL extends Router {
  rootURL = '/app/';
}

class BlogEngine extends Engine {
  Resolver = ModuleBasedTestResolver;
}

function blogRoutes() {
  this.route('about');
  this.route('post', { path: '/posts/:post_id' });
}

class SearchController extends Controller {
  queryParams = ['q', 'sort'];
  q = null;
  sort = 'asc';
}

class State {
  @tracked postId = '1';
}

module('Helpers test: {{isActive}}', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', Router);
    this.owner.register('controller:search', SearchController);
    this.owner.register('engine:blog', BlogEngine);
    this.owner.register('route-map:blog', blogRoutes);
    this.owner.setupRouter();
  });

  test('it matches the active class of `<LinkTo>` for routes without dynamic segments', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/');

    await render(
      <template>
        <span id='index'>{{isActive 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>

        <span id='about'>{{isActive 'about'}}</span>
        <LinkTo id='link-about' @route='about'>About</LinkTo>

        <span id='application'>{{isActive 'application'}}</span>
        <LinkTo id='link-application' @route='application'>App</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('true');
    assert.dom('#link-index').hasClass('active');
    assert.dom('#about').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('active');
    assert.dom('#application').hasText('true');
    assert.dom('#link-application').hasClass('active');

    await router.transitionTo('/about');
    await settled();

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('active');
    assert.dom('#about').hasText('true');
    assert.dom('#link-about').hasClass('active');
    assert.dom('#application').hasText('true');
    assert.dom('#link-application').hasClass('active');
  });

  test('it matches the active class of `<LinkTo>` for parent and child routes', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <span id='post'>{{isActive 'post' '1'}}</span>
        <LinkTo id='link-post' @route='post' @model='1'>Post 1</LinkTo>

        <span id='post-index'>{{isActive 'post.index' '1'}}</span>
        <LinkTo id='link-post-index' @route='post.index' @model='1'>Post 1</LinkTo>

        <span id='other-post'>{{isActive 'post' '2'}}</span>
        <LinkTo id='link-other-post' @route='post' @model='2'>Post 2</LinkTo>

        <span id='comment'>{{isActive 'post.comment' '1' '7'}}</span>
        <LinkTo id='link-comment' @route='post.comment' @models={{Array.of '1' '7'}}>
          Comment
        </LinkTo>

        <span id='other-comment'>{{isActive 'post.comment' '2' '7'}}</span>
        <LinkTo id='link-other-comment' @route='post.comment' @models={{Array.of '2' '7'}}>
          Comment
        </LinkTo>
      </template>
    );

    assert.dom('#post').hasText('true');
    assert.dom('#link-post').hasClass('active');
    assert.dom('#post-index').hasText('true');
    assert.dom('#link-post-index').hasClass('active');
    assert.dom('#other-post').hasText('false');
    assert.dom('#link-other-post').doesNotHaveClass('active');
    assert.dom('#comment').hasText('false');
    assert.dom('#link-comment').doesNotHaveClass('active');

    await router.transitionTo('/posts/1/comments/7');
    await settled();

    assert.dom('#post').hasText('true');
    assert.dom('#link-post').hasClass('active');
    assert.dom('#post-index').hasText('false');
    assert.dom('#link-post-index').doesNotHaveClass('active');
    assert.dom('#other-post').hasText('false');
    assert.dom('#link-other-post').doesNotHaveClass('active');
    assert.dom('#comment').hasText('true');
    assert.dom('#link-comment').hasClass('active');
    assert.dom('#other-comment').hasText('false');
    assert.dom('#link-other-comment').doesNotHaveClass('active');

    await router.transitionTo('/posts/2/comments/7');
    await settled();

    assert.dom('#post').hasText('false');
    assert.dom('#link-post').doesNotHaveClass('active');
    assert.dom('#other-post').hasText('true');
    assert.dom('#link-other-post').hasClass('active');
    assert.dom('#comment').hasText('false');
    assert.dom('#link-comment').doesNotHaveClass('active');
    assert.dom('#other-comment').hasText('true');
    assert.dom('#link-other-comment').hasClass('active');
  });

  test('it accepts the models as the named argument `models`', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/posts/1/comments/7');

    await render(
      <template>
        <span id='single'>{{isActive 'post' models='1'}}</span>
        <span id='list'>{{isActive 'post.comment' models=(Array.of '1' '7')}}</span>
        <span id='other'>{{isActive 'post.comment' models=(Array.of '1' '8')}}</span>
      </template>
    );

    assert.dom('#single').hasText('true');
    assert.dom('#list').hasText('true');
    assert.dom('#other').hasText('false');
  });

  test('it does not accept positional models together with `models`', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isActive 'post' '1' models='1'}}</template>),
      /You cannot provide both positional models and the `models` argument to the `isActive` helper\./
    );
  });

  test('it does not accept a route name that is not a string', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isActive 42}}</template>),
      /The route name of the `isActive` helper must be a string\./
    );
  });

  test('it does not accept `queryParams` that is not an object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isActive 'post' '1' queryParams='q=ember'}}</template>),
      /The `queryParams` argument to the `isActive` helper must be an object\./
    );
  });

  test('it returns false before the first transition', async function (assert) {
    await render(
      <template>
        <span id='index'>{{isActive 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('active');
  });

  test('it matches the active class of `<LinkTo>` for query params', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/search');

    await render(
      <template>
        <span id='none'>{{isActive 'search'}}</span>
        <LinkTo id='link-none' @route='search'>Search</LinkTo>

        <span id='ember'>{{isActive 'search' queryParams=(hash q='ember')}}</span>
        <LinkTo id='link-ember' @route='search' @query={{hash q='ember'}}>Ember</LinkTo>

        <span id='asc'>{{isActive 'search' queryParams=(hash sort='asc')}}</span>
        <LinkTo id='link-asc' @route='search' @query={{hash sort='asc'}}>Asc</LinkTo>

        <span id='desc'>{{isActive 'search' queryParams=(hash sort='desc')}}</span>
        <LinkTo id='link-desc' @route='search' @query={{hash sort='desc'}}>Desc</LinkTo>

        <span id='both'>{{isActive 'search' queryParams=(hash q='ember' sort='asc')}}</span>
        <LinkTo id='link-both' @route='search' @query={{hash q='ember' sort='asc'}}>Both</LinkTo>
      </template>
    );

    assert.dom('#none').hasText('true');
    assert.dom('#link-none').hasClass('active');
    assert.dom('#ember').hasText('false');
    assert.dom('#link-ember').doesNotHaveClass('active');
    assert.dom('#asc').hasText('true', 'asc is the default value');
    assert.dom('#link-asc').hasClass('active');
    assert.dom('#desc').hasText('false');
    assert.dom('#link-desc').doesNotHaveClass('active');
    assert.dom('#both').hasText('false');
    assert.dom('#link-both').doesNotHaveClass('active');

    await router.transitionTo('/search?q=ember');
    await settled();

    assert.dom('#none').hasText('true');
    assert.dom('#link-none').hasClass('active');
    assert.dom('#ember').hasText('true');
    assert.dom('#link-ember').hasClass('active');
    assert.dom('#asc').hasText('true', 'the active q is kept');
    assert.dom('#link-asc').hasClass('active');
    assert.dom('#desc').hasText('false');
    assert.dom('#link-desc').doesNotHaveClass('active');
    assert.dom('#both').hasText('true');
    assert.dom('#link-both').hasClass('active');

    await router.transitionTo('/search?q=glimmer&sort=desc');
    await settled();

    assert.dom('#none').hasText('true');
    assert.dom('#link-none').hasClass('active');
    assert.dom('#ember').hasText('false');
    assert.dom('#link-ember').doesNotHaveClass('active');
    assert.dom('#asc').hasText('false');
    assert.dom('#link-asc').doesNotHaveClass('active');
    assert.dom('#desc').hasText('true', 'the active q is kept');
    assert.dom('#link-desc').hasClass('active');
    assert.dom('#both').hasText('false');
    assert.dom('#link-both').doesNotHaveClass('active');

    await router.transitionTo('/about');
    await settled();

    assert.dom('#none').hasText('false');
    assert.dom('#link-none').doesNotHaveClass('active');
    assert.dom('#asc').hasText('false');
    assert.dom('#link-asc').doesNotHaveClass('active');
  });

  test('it returns false when the route or a model is missing', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <span id='model'>{{isActive 'post' undefined}}</span>
        <LinkTo id='link-model' @route='post' @model={{undefined}}>Post</LinkTo>

        <span id='models'>{{isActive 'post' models=(Array.of null)}}</span>
        <span id='route'>{{isActive null}}</span>
      </template>
    );

    assert.dom('#model').hasText('false');
    assert.dom('#link-model').doesNotHaveClass('active');
    assert.dom('#models').hasText('false');
    assert.dom('#route').hasText('false');
  });

  test('it updates when a model changes', async function (assert) {
    let router = this.owner.lookup('service:router');
    let state = new State();

    await router.transitionTo('/posts/2');

    await render(
      <template>
        <span id='post'>{{isActive 'post' state.postId}}</span>
      </template>
    );

    assert.dom('#post').hasText('false');

    state.postId = '2';
    await settled();

    assert.dom('#post').hasText('true');

    state.postId = null;
    await settled();

    assert.dom('#post').hasText('false');
  });

  test('it matches the active class of `<LinkTo>` in a loading substate', async function (assert) {
    let router = this.owner.lookup('service:router');
    let model = Promise.withResolvers();

    this.owner.register(
      'route:slow',
      class extends Route {
        model() {
          return model.promise;
        }
      }
    );
    this.owner.register('template:loading', <template>Loading</template>);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='index'>{{isActive 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>

        <span id='slow'>{{isActive 'slow'}}</span>
        <LinkTo id='link-slow' @route='slow'>Slow</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('true');
    assert.dom('#link-index').hasClass('active');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('active');

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.strictEqual(router.currentRouteName, 'loading', 'the app is in the loading substate');
    assert.dom('#index').hasText('true');
    assert.dom('#link-index').hasClass('active');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('active');

    model.resolve();
    await transition;
    await settled();

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('active');
    assert.dom('#slow').hasText('true');
    assert.dom('#link-slow').hasClass('active');
  });
});

module('Helpers test: {{isActive}} with a custom rootURL', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', RouterWithRootURL);
    this.owner.register('engine:blog', BlogEngine);
    this.owner.register('route-map:blog', blogRoutes);
    this.owner.setupRouter();
  });

  test('it does not depend on the rootURL', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/');

    await render(
      <template>
        <span id='about'>{{isActive 'about'}}</span>
        <LinkTo id='link-about' @route='about'>About</LinkTo>
      </template>
    );

    assert.dom('#about').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('active');

    await router.transitionTo('/about');
    await settled();

    assert.dom('#about').hasText('true');
    assert.dom('#link-about').hasClass('active');
  });
});

module('Helpers test: {{isActive}} in an engine', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', Router);
    this.owner.register('engine:blog', BlogEngine);
    this.owner.register('route-map:blog', blogRoutes);
    this.owner.setupRouter();
  });

  test('it resolves route names from the mount point of the engine', async function (assert) {
    let router = this.owner.lookup('service:router');
    let engine = this.owner.buildChildEngineInstance('blog', {
      routable: true,
      mountPoint: 'blog',
    });

    associateDestroyableChild(this.owner, engine);
    await engine.boot();

    await router.transitionTo('/blog');
    await render(
      <template>
        <div id='engine'></div>
      </template>
    );

    renderComponent(
      <template>
        <span id='index'>{{isActive 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>

        <span id='about'>{{isActive 'about'}}</span>
        <LinkTo id='link-about' @route='about'>About</LinkTo>

        <span id='application'>{{isActive 'application'}}</span>
        <LinkTo id='link-application' @route='application'>Blog</LinkTo>

        <span id='post'>{{isActive 'post' '1'}}</span>
        <LinkTo id='link-post' @route='post' @model='1'>Post</LinkTo>
      </template>,
      { into: find('#engine'), owner: engine }
    );
    await settled();

    assert.dom('#link-about').hasAttribute('href', '/blog/about');

    assert.dom('#index').hasText('true');
    assert.dom('#link-index').hasClass('active');
    assert.dom('#about').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('active');
    assert.dom('#application').hasText('true');
    assert.dom('#link-application').hasClass('active');
    assert.dom('#post').hasText('false');
    assert.dom('#link-post').doesNotHaveClass('active');

    await router.transitionTo('/blog/about');
    await settled();

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('active');
    assert.dom('#about').hasText('true');
    assert.dom('#link-about').hasClass('active');
    assert.dom('#application').hasText('true');
    assert.dom('#link-application').hasClass('active');

    await router.transitionTo('/blog/posts/1');
    await settled();

    assert.dom('#about').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('active');
    assert.dom('#post').hasText('true');
    assert.dom('#link-post').hasClass('active');
  });

  test('it is not supported in a routeless engine', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let engine = this.owner.buildChildEngineInstance('blog');

    associateDestroyableChild(this.owner, engine);
    await engine.boot();

    await render(
      <template>
        <div id='engine'></div>
      </template>
    );

    assert.throws(
      () =>
        renderComponent(
          <template>{{isActive 'about'}}</template>,
          { into: find('#engine'), owner: engine }
        ),
      /You attempted to use the `isActive` helper within a routeless engine, this is not supported\./
    );
  });
});
