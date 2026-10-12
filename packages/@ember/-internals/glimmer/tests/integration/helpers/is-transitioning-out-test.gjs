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
import { LinkTo, isTransitioningOut } from '@ember/routing';
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

module('Helpers test: {{isTransitioningOut}}', function (hooks) {
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

  test('it matches the `ember-transitioning-out` class of `<LinkTo>` during a transition', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:slow', this.SlowRoute);

    await router.transitionTo('/');

    await render(
      <template>
        <span id='index'>{{isTransitioningOut 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>

        <span id='slow'>{{isTransitioningOut 'slow'}}</span>
        <LinkTo id='link-slow' @route='slow'>Slow</LinkTo>

        <span id='about'>{{isTransitioningOut 'about'}}</span>
        <LinkTo id='link-about' @route='about'>About</LinkTo>

        <span id='application'>{{isTransitioningOut 'application'}}</span>
        <LinkTo id='link-application' @route='application'>App</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-out');

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#index').hasText('true');
    assert.dom('#link-index').hasClass('ember-transitioning-out');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#about').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#application').hasText('false', 'the application route stays active');
    assert.dom('#link-application').doesNotHaveClass('ember-transitioning-out');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#slow').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-out');
  });

  test('it returns false before the first transition', async function (assert) {
    await render(
      <template>
        <span id='index'>{{isTransitioningOut 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>
      </template>
    );

    assert.dom('#index').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-out');
  });

  test('it uses the models', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:slow', this.SlowRoute);

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <span id='post'>{{isTransitioningOut 'post' '1'}}</span>
        <LinkTo id='link-post' @route='post' @model='1'>Post 1</LinkTo>

        <span id='named'>{{isTransitioningOut 'post' models='1'}}</span>
        <span id='named-list'>{{isTransitioningOut 'post' models=(Array.of '1')}}</span>

        <span id='other'>{{isTransitioningOut 'post' '2'}}</span>
        <LinkTo id='link-other' @route='post' @model='2'>Post 2</LinkTo>
      </template>
    );

    assert.dom('#post').hasText('false');
    assert.dom('#link-post').doesNotHaveClass('ember-transitioning-out');

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#post').hasText('true');
    assert.dom('#link-post').hasClass('ember-transitioning-out');
    assert.dom('#named').hasText('true');
    assert.dom('#named-list').hasText('true');
    assert.dom('#other').hasText('false');
    assert.dom('#link-other').doesNotHaveClass('ember-transitioning-out');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#post').hasText('false');
    assert.dom('#link-post').doesNotHaveClass('ember-transitioning-out');
  });

  test('it uses the query params', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:slow', this.SlowRoute);

    await router.transitionTo('/search?q=ember');

    await render(
      <template>
        <span id='ember'>{{isTransitioningOut 'search' queryParams=(hash q='ember')}}</span>
        <LinkTo id='link-ember' @route='search' @query={{hash q='ember'}}>Ember</LinkTo>

        <span id='glimmer'>{{isTransitioningOut 'search' queryParams=(hash q='glimmer')}}</span>
        <LinkTo id='link-glimmer' @route='search' @query={{hash q='glimmer'}}>Glimmer</LinkTo>
      </template>
    );

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#ember').hasText('true');
    assert.dom('#link-ember').hasClass('ember-transitioning-out');
    assert.dom('#glimmer').hasText('false');
    assert.dom('#link-glimmer').doesNotHaveClass('ember-transitioning-out');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#ember').hasText('false');
    assert.dom('#link-ember').doesNotHaveClass('ember-transitioning-out');
  });

  test('it returns false when the route or a model is missing', async function (assert) {
    let router = this.owner.lookup('service:router');

    this.owner.register('route:slow', this.SlowRoute);

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <span id='model'>{{isTransitioningOut 'post' null}}</span>
        <LinkTo id='link-model' @route='post' @model={{null}}>Post</LinkTo>

        <span id='models'>{{isTransitioningOut 'post' models=(Array.of undefined)}}</span>
        <span id='route'>{{isTransitioningOut null}}</span>
      </template>
    );

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#model').hasText('false');
    assert.dom('#link-model').doesNotHaveClass('ember-transitioning-out');
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
      render(<template>{{isTransitioningOut 'post' '1' models='1'}}</template>),
      /You cannot provide both positional models and the `models` argument to the `isTransitioningOut` helper\./
    );
  });

  test('it does not accept a model object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    let post = { id: '1' };

    await assert.rejects(
      render(<template>{{isTransitioningOut 'post' post}}</template>),
      /The models of the `isTransitioningOut` helper must be strings or numbers\. Pass the value of the dynamic segment, not a model object\./
    );
  });

  test('it does not accept a route name that is not a string', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isTransitioningOut 42}}</template>),
      /The route name of the `isTransitioningOut` helper must be a string\./
    );
  });

  test('it does not accept `queryParams` that is not an object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isTransitioningOut 'search' queryParams='q=ember'}}</template>),
      /The `queryParams` argument to the `isTransitioningOut` helper must be an object\./
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

    await router.transitionTo('/blog/about');
    await render(
      <template>
        <div id='engine'></div>
      </template>
    );

    renderComponent(
      <template>
        <span id='yes'>{{isTransitioningOut 'about'}}</span>
        <LinkTo id='link-yes' @route='about'>Yes</LinkTo>

        <span id='no'>{{isTransitioningOut 'slow'}}</span>
        <LinkTo id='link-no' @route='slow'>No</LinkTo>

        <span id='application'>{{isTransitioningOut 'application'}}</span>
        <LinkTo id='link-application' @route='application'>Blog</LinkTo>
      </template>,
      { into: find('#engine'), owner: engine }
    );
    await settled();

    assert.dom('#yes').hasText('false');
    assert.dom('#link-yes').doesNotHaveClass('ember-transitioning-out');

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#yes').hasText('true');
    assert.dom('#link-yes').hasClass('ember-transitioning-out');
    assert.dom('#no').hasText('false');
    assert.dom('#link-no').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#application').hasText('true');
    assert.dom('#link-application').hasClass('ember-transitioning-out');

    this.model.resolve();
    await transition;
    await settled();

    assert.dom('#yes').hasText('false');
    assert.dom('#link-yes').doesNotHaveClass('ember-transitioning-out');
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
          <template>{{isTransitioningOut 'about'}}</template>,
          { into: find('#engine'), owner: engine }
        ),
      /You attempted to use the `isTransitioningOut` helper within a routeless engine, this is not supported\./
    );
  });
});
