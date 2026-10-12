import { DEBUG } from '@glimmer/env';
import { module, test } from 'qunit';
import { defer } from 'rsvp';
import { setupRenderingTest } from 'ember-qunit';
import { find, render, settled } from '@ember/test-helpers';
import Controller from '@ember/controller';
import { associateDestroyableChild } from '@ember/destroyable';
import Engine from '@ember/engine';
import { hash } from '@ember/helper';
import { renderComponent, renderSettled } from '@ember/renderer';
import { LinkTo, isTransitioningIn } from '@ember/routing';
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
  this.route('post', { path: '/posts/:post_id' });
  this.mount('blog');
});

class SearchController extends Controller {
  queryParams = ['q'];
  q = null;
}

module('Helpers test: {{isTransitioningIn}}', function (hooks) {
  setupRenderingTest(hooks);

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
        }
      }
    );
    this.owner.register('route-map:blog', function () {
      this.route('about');
      this.route('slow');
    });
    this.owner.setupRouter();
  });

  test('it matches the `ember-transitioning-in` class of `<LinkTo>` during a transition', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:slow', this.SlowRoute);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='index'>{{isTransitioningIn 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>

        <span id='slow'>{{isTransitioningIn 'slow'}}</span>
        <LinkTo id='link-slow' @route='slow'>Slow</LinkTo>

        <span id='about'>{{isTransitioningIn 'about'}}</span>
        <LinkTo id='link-about' @route='about'>About</LinkTo>

        <span id='application'>{{isTransitioningIn 'application'}}</span>
        <LinkTo id='link-application' @route='application'>App</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-in');

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#slow').hasText('true');
    assert.dom('#link-slow').hasClass('ember-transitioning-in');
    assert.dom('#about').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#application').hasText('false', 'the application route stays active');
    assert.dom('#link-application').doesNotHaveClass('ember-transitioning-in');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-in');
  });

  test('it returns false before the first transition', async function (assert) {
    await render(
      <template>
        <span id='index'>{{isTransitioningIn 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-in');
  });

  test('it uses the models', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:post', this.SlowRoute);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='post'>{{isTransitioningIn 'post' '1'}}</span>
        <LinkTo id='link-post' @route='post' @model='1'>Post 1</LinkTo>

        <span id='named'>{{isTransitioningIn 'post' models='1'}}</span>
        <span id='named-list'>{{isTransitioningIn 'post' models=(Array.of '1')}}</span>

        <span id='other'>{{isTransitioningIn 'post' '2'}}</span>
        <LinkTo id='link-other' @route='post' @model='2'>Post 2</LinkTo>
      </template>
    );

    assert.dom('#post').hasText('false');
    assert.dom('#link-post').doesNotHaveClass('ember-transitioning-in');

    let transition = router.transitionTo('/posts/1');
    await renderSettled();

    assert.dom('#post').hasText('true');
    assert.dom('#link-post').hasClass('ember-transitioning-in');
    assert.dom('#named').hasText('true');
    assert.dom('#named-list').hasText('true');
    assert.dom('#other').hasText('false');
    assert.dom('#link-other').doesNotHaveClass('ember-transitioning-in');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#post').hasText('false');
    assert.dom('#link-post').doesNotHaveClass('ember-transitioning-in');
  });

  test('it uses the query params', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:search', this.SlowRoute);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='ember'>{{isTransitioningIn 'search' queryParams=(hash q='ember')}}</span>
        <LinkTo id='link-ember' @route='search' @query={{hash q='ember'}}>Ember</LinkTo>

        <span id='glimmer'>{{isTransitioningIn 'search' queryParams=(hash q='glimmer')}}</span>
        <LinkTo id='link-glimmer' @route='search' @query={{hash q='glimmer'}}>Glimmer</LinkTo>
      </template>
    );

    let transition = router.transitionTo('/search?q=ember');
    await renderSettled();

    assert.dom('#ember').hasText('true');
    assert.dom('#link-ember').hasClass('ember-transitioning-in');
    assert.dom('#glimmer').hasText('false');
    assert.dom('#link-glimmer').doesNotHaveClass('ember-transitioning-in');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#ember').hasText('false');
    assert.dom('#link-ember').doesNotHaveClass('ember-transitioning-in');
  });

  test('it returns false when the route or a model is missing', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:post', this.SlowRoute);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='model'>{{isTransitioningIn 'post' null}}</span>
        <LinkTo id='link-model' @route='post' @model={{null}}>Post</LinkTo>

        <span id='models'>{{isTransitioningIn 'post' models=(Array.of undefined)}}</span>
        <span id='route'>{{isTransitioningIn null}}</span>
      </template>
    );

    let transition = router.transitionTo('/posts/1');
    await renderSettled();

    assert.dom('#model').hasText('false');
    assert.dom('#link-model').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#models').hasText('false');
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
      render(<template>{{isTransitioningIn 'post' '1' models='1'}}</template>),
      /You cannot provide both positional models and the `models` argument to the `isTransitioningIn` helper\./
    );
  });

  test('it does not accept a route name that is not a string', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isTransitioningIn 42}}</template>),
      /The route name of the `isTransitioningIn` helper must be a string\./
    );
  });

  test('it does not accept `queryParams` that is not an object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isTransitioningIn 'search' queryParams='q=ember'}}</template>),
      /The `queryParams` argument to the `isTransitioningIn` helper must be an object\./
    );
  });

  test('it resolves route names from the mount point of the engine', async function (assert) {
    let router = this.owner.lookup('service:router');
    let engine = this.owner.buildChildEngineInstance('blog', {
      routable: true,
      mountPoint: 'blog',
    });

    associateDestroyableChild(this.owner, engine);
    await engine.boot();

    this.owner.register('route:slow', this.SlowRoute);

    await router.transitionTo('/blog');
    await render(
      <template>
        <div id='engine'></div>
      </template>
    );

    renderComponent(
      <template>
        <span id='yes'>{{isTransitioningIn 'slow'}}</span>
        <LinkTo id='link-yes' @route='slow'>Yes</LinkTo>

        <span id='no'>{{isTransitioningIn 'about'}}</span>
        <LinkTo id='link-no' @route='about'>No</LinkTo>

        <span id='application'>{{isTransitioningIn 'application'}}</span>
        <LinkTo id='link-application' @route='application'>Blog</LinkTo>
      </template>,
      { into: find('#engine'), owner: engine }
    );
    await settled();

    assert.dom('#yes').hasText('false');
    assert.dom('#link-yes').doesNotHaveClass('ember-transitioning-in');

    let transition = router.transitionTo('/blog/slow');
    await renderSettled();

    assert.dom('#yes').hasText('true');
    assert.dom('#link-yes').hasClass('ember-transitioning-in');
    assert.dom('#no').hasText('false');
    assert.dom('#link-no').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#application').hasText('false');
    assert.dom('#link-application').doesNotHaveClass('ember-transitioning-in');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#yes').hasText('false');
    assert.dom('#link-yes').doesNotHaveClass('ember-transitioning-in');
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
          <template>{{isTransitioningIn 'about'}}</template>,
          { into: find('#engine'), owner: engine }
        ),
      /You attempted to use the `isTransitioningIn` helper within a routeless engine, this is not supported\./
    );
  });
});
