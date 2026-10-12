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
import {
  LinkTo,
  isActive,
  isLoading,
  isTransitioningIn,
  isTransitioningOut,
  rootUrl,
  urlFor,
} from '@ember/routing';
import Route from '@ember/routing/route';
import EmberRouter from '@ember/routing/router';
import { ModuleBasedTestResolver } from 'internal-test-helpers';

/**
  `<LinkTo>` is the reference implementation in RFC 391.
  Most tests render `<LinkTo>` with the same arguments as the helper,
  and compare the two results.
*/

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('about');
  this.route('slow');
  this.route('search');
  this.route('post', { path: '/posts/:post_id' }, function () {
    this.route('comments');
    this.route('comment', { path: '/comments/:comment_id' });
  });
  this.mount('blog');
});

class SearchController extends Controller {
  queryParams = ['q', 'sort'];
  q = null;
  sort = 'asc';
}

class State {
  @tracked postId = '1';
}

function setupRouter(hooks, RouterClass = Router) {
  hooks.beforeEach(function () {
    this.owner.register('router:main', RouterClass);
    this.owner.register('controller:search', SearchController);
    this.owner.register(
      'engine:blog',
      class extends Engine {
        Resolver = ModuleBasedTestResolver;
      }
    );
    this.owner.register('route-map:blog', function () {
      this.route('about');
      this.route('post', { path: '/posts/:post_id' });
    });
    this.owner.setupRouter();
  });
}

module('Router helpers: {{urlFor}}', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(hooks);

  test('it generates the URL of a route without dynamic segments', async function (assert) {
    await render(
      <template>
        <a id='about' href={{urlFor 'about'}}>About</a>
        <a id='index' href={{urlFor 'index'}}>Home</a>
      </template>
    );

    assert.dom('#about').hasAttribute('href', '/about');
    assert.dom('#index').hasAttribute('href', '/');
  });

  test('it accepts the models as positional arguments', async function (assert) {
    let post = { id: '42' };

    await render(
      <template>
        <a id='id' href={{urlFor 'post' '42'}}>Post</a>
        <a id='object' href={{urlFor 'post' post}}>Post</a>
        <a id='two' href={{urlFor 'post.comment' '42' '7'}}>Comment</a>

        <LinkTo id='link-object' @route='post' @model={{post}}>Post</LinkTo>
        <LinkTo id='link-two' @route='post.comment' @models={{Array.of '42' '7'}}>
          Comment
        </LinkTo>
      </template>
    );

    assert.dom('#id').hasAttribute('href', '/posts/42');
    assert.dom('#object').hasAttribute('href', '/posts/42');
    assert.dom('#link-object').hasAttribute('href', '/posts/42');
    assert.dom('#two').hasAttribute('href', '/posts/42/comments/7');
    assert.dom('#link-two').hasAttribute('href', '/posts/42/comments/7');
  });

  test('it accepts the models as the named argument `models`', async function (assert) {
    await render(
      <template>
        <a id='single' href={{urlFor 'post' models='42'}}>Post</a>
        <a id='list' href={{urlFor 'post.comment' models=(Array.of '42' '7')}}>Comment</a>
      </template>
    );

    assert.dom('#single').hasAttribute('href', '/posts/42');
    assert.dom('#list').hasAttribute('href', '/posts/42/comments/7');
  });

  test('it does not accept positional models together with `models`', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          <a href={{urlFor 'post' '42' models='43'}}>Post</a>
        </template>
      ),
      /You cannot provide both positional models and the `models` argument to the `urlFor` helper\./
    );
  });

  test('it does not accept a route name that is not a string', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          <a href={{urlFor 42}}>Post</a>
        </template>
      ),
      /The route name of the `urlFor` helper must be a string\./
    );
  });

  test('it does not accept `queryParams` that is not an object', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(
        <template>
          <a href={{urlFor 'search' queryParams='q=ember'}}>Search</a>
        </template>
      ),
      /The `queryParams` argument to the `urlFor` helper must be an object\./
    );
  });

  test('it serializes the given query params', async function (assert) {
    await render(
      <template>
        <a id='search' href={{urlFor 'search' queryParams=(hash q='ember')}}>Search</a>
        <a id='post' href={{urlFor 'post' '42' queryParams=(hash q='ember')}}>Post</a>
      </template>
    );

    assert.dom('#search').hasAttribute('href', '/search?q=ember');
    assert.dom('#post').hasAttribute('href', '/posts/42?q=ember');
  });

  test('it does not serialize the default query params of the controller', async function (assert) {
    await render(
      <template>
        <a id='search' href={{urlFor 'search'}}>Search</a>
      </template>
    );

    assert.dom('#search').hasAttribute('href', '/search');
  });

  test('it gives a missing model to the router service', async function (assert) {
    let router = this.owner.lookup('service:router');

    assert.throws(() => router.urlFor('post', null), /You must provide param `post_id`/);

    await assert.rejects(
      render(
        <template>
          <a href={{urlFor 'post' null}}>Post</a>
        </template>
      ),
      /You must provide param `post_id`/
    );
  });

  test('it updates when a model changes', async function (assert) {
    let state = new State();

    await render(
      <template>
        <a id='post' href={{urlFor 'post' state.postId}}>Post</a>
      </template>
    );

    assert.dom('#post').hasAttribute('href', '/posts/1');

    state.postId = '2';
    await settled();

    assert.dom('#post').hasAttribute('href', '/posts/2');
  });

  test('it updates when the dynamic segments of the active routes change', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <a id='comments' href={{urlFor 'post.comments'}}>Comments</a>
        <LinkTo id='link-comments' @route='post.comments'>Comments</LinkTo>
      </template>
    );

    assert.dom('#comments').hasAttribute('href', '/posts/1/comments');
    assert.dom('#link-comments').hasAttribute('href', '/posts/1/comments');

    await router.transitionTo('/posts/2');
    await settled();

    assert.dom('#comments').hasAttribute('href', '/posts/2/comments');
    assert.dom('#link-comments').hasAttribute('href', '/posts/2/comments');
  });
});

module('Router helpers: {{rootUrl}}', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(hooks);

  test('it returns the default rootURL', async function (assert) {
    await render(
      <template>
        <span id='text'>{{rootUrl}}</span>
        <a id='attribute' href='{{(rootUrl)}}about'>About</a>
      </template>
    );

    assert.dom('#text').hasText('/');
    assert.dom('#attribute').hasAttribute('href', '/about');
  });
});

module('Router helpers: with a custom rootURL', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(
    hooks,
    class extends Router {
      rootURL = '/app/';
    }
  );

  test('{{rootUrl}} returns the rootURL of the router', async function (assert) {
    await render(
      <template>
        <span id='text'>{{rootUrl}}</span>
        <a id='attribute' href='{{(rootUrl)}}about'>About</a>
      </template>
    );

    assert.dom('#text').hasText('/app/');
    assert.dom('#attribute').hasAttribute('href', '/app/about');
  });

  test('{{urlFor}} includes the rootURL', async function (assert) {
    await render(
      <template>
        <a id='index' href={{urlFor 'index'}}>Home</a>
        <a id='about' href={{urlFor 'about'}}>About</a>
        <a id='post' href={{urlFor 'post' '42' queryParams=(hash q='ember')}}>Post</a>
        <LinkTo id='link-about' @route='about'>About</LinkTo>
      </template>
    );

    assert.dom('#index').hasAttribute('href', '/app/');
    assert.dom('#about').hasAttribute('href', '/app/about');
    assert.dom('#post').hasAttribute('href', '/app/posts/42?q=ember');
    assert.dom('#link-about').hasAttribute('href', '/app/about');
  });

  test('{{isActive}} does not depend on the rootURL', async function (assert) {
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

module('Router helpers: {{isActive}}', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(hooks);

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

module('Router helpers: {{isLoading}}', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(hooks);

  test('it returns false when the route and all models are present', async function (assert) {
    await render(
      <template>
        <span id='route'>{{isLoading 'index'}}</span>
        <LinkTo id='link-route' @route='index'>Home</LinkTo>

        <span id='model'>{{isLoading 'post' '42'}}</span>
        <LinkTo id='link-model' @route='post' @model='42'>Post</LinkTo>

        <span id='models'>{{isLoading 'post.comment' '42' '7'}}</span>
        <span id='named'>{{isLoading 'post.comment' models=(Array.of '42' '7')}}</span>
        <span id='named-single'>{{isLoading 'post' models='42'}}</span>
        <span id='query'>{{isLoading 'post' '42' queryParams=(hash q='ember')}}</span>
      </template>
    );

    assert.dom('#route').hasText('false');
    assert.dom('#link-route').doesNotHaveClass('loading');
    assert.dom('#model').hasText('false');
    assert.dom('#link-model').doesNotHaveClass('loading');
    assert.dom('#models').hasText('false');
    assert.dom('#named').hasText('false');
    assert.dom('#named-single').hasText('false');
    assert.dom('#query').hasText('false');
  });

  test('it does not treat falsy values as missing', async function (assert) {
    await render(
      <template>
        <span id='zero'>{{isLoading 'post' 0}}</span>
        <LinkTo id='link-zero' @route='post' @model={{0}}>Post</LinkTo>

        <span id='empty'>{{isLoading 'post' ''}}</span>
        <span id='false'>{{isLoading 'post' false}}</span>
        <span id='empty-route'>{{isLoading ''}}</span>
      </template>
    );

    assert.dom('#zero').hasText('false');
    assert.dom('#link-zero').doesNotHaveClass('loading');
    assert.dom('#empty').hasText('false');
    assert.dom('#false').hasText('false');
    assert.dom('#empty-route').hasText('false');
  });

  test('it returns true when a positional model is missing', async function (assert) {
    await render(
      <template>
        <span id='null'>{{isLoading 'post' null}}</span>
        <LinkTo id='link-null' @route='post' @model={{null}}>Post</LinkTo>

        <span id='undefined'>{{isLoading 'post' undefined}}</span>
        <LinkTo id='link-undefined' @route='post' @model={{undefined}}>Post</LinkTo>

        <span id='first'>{{isLoading 'post.comment' null '7'}}</span>
        <span id='last'>{{isLoading 'post.comment' '42' undefined}}</span>
        <span id='query'>{{isLoading 'post' null queryParams=(hash q='ember')}}</span>
      </template>
    );

    assert.dom('#null').hasText('true');
    assert.dom('#link-null').hasClass('loading');
    assert.dom('#undefined').hasText('true');
    assert.dom('#link-undefined').hasClass('loading');
    assert.dom('#first').hasText('true');
    assert.dom('#last').hasText('true');
    assert.dom('#query').hasText('true');
  });

  test('it returns true when a model in `models` is missing', async function (assert) {
    await render(
      <template>
        <span id='list'>{{isLoading 'post.comment' models=(Array.of '42' null)}}</span>
        <LinkTo id='link-list' @route='post.comment' @models={{Array.of '42' null}}>
          Comment
        </LinkTo>

        <span id='single'>{{isLoading 'post' models=null}}</span>
        <span id='query'>
          {{isLoading 'post' models=(Array.of null) queryParams=(hash q='ember')}}
        </span>
      </template>
    );

    assert.dom('#list').hasText('true');
    assert.dom('#link-list').hasClass('loading');
    assert.dom('#single').hasText('true');
    assert.dom('#query').hasText('true');
  });

  test('it returns true when the route is missing', async function (assert) {
    await render(
      <template>
        <span id='null'>{{isLoading null}}</span>
        <LinkTo id='link-null' @route={{null}}>Unknown</LinkTo>

        <span id='undefined'>{{isLoading undefined}}</span>
        <LinkTo id='link-undefined' @route={{undefined}}>Unknown</LinkTo>
      </template>
    );

    assert.dom('#null').hasText('true');
    assert.dom('#link-null').hasClass('loading');
    assert.dom('#undefined').hasText('true');
    assert.dom('#link-undefined').hasClass('loading');
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

  test('it updates when a model changes', async function (assert) {
    let state = new State();

    await render(
      <template>
        <span id='positional'>{{isLoading 'post' state.postId}}</span>
        <span id='named'>{{isLoading 'post' models=(Array.of state.postId)}}</span>
      </template>
    );

    assert.dom('#positional').hasText('false');
    assert.dom('#named').hasText('false');

    state.postId = undefined;
    await settled();

    assert.dom('#positional').hasText('true');
    assert.dom('#named').hasText('true');

    state.postId = '42';
    await settled();

    assert.dom('#positional').hasText('false');
    assert.dom('#named').hasText('false');
  });
});

module('Router helpers: {{isTransitioningIn}} and {{isTransitioningOut}}', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(hooks);

  hooks.beforeEach(function () {
    let model = (this.slowModel = Promise.withResolvers());

    this.owner.register(
      'route:slow',
      class extends Route {
        model() {
          return model.promise;
        }
      }
    );
  });

  test('they match the classes of `<LinkTo>` during a transition', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/');

    await render(
      <template>
        <span id='index-in'>{{isTransitioningIn 'index'}}</span>
        <span id='index-out'>{{isTransitioningOut 'index'}}</span>
        <LinkTo id='link-index' @route='index'>Home</LinkTo>

        <span id='slow-in'>{{isTransitioningIn 'slow'}}</span>
        <span id='slow-out'>{{isTransitioningOut 'slow'}}</span>
        <LinkTo id='link-slow' @route='slow'>Slow</LinkTo>

        <span id='about-in'>{{isTransitioningIn 'about'}}</span>
        <span id='about-out'>{{isTransitioningOut 'about'}}</span>
        <LinkTo id='link-about' @route='about'>About</LinkTo>

        <span id='application-in'>{{isTransitioningIn 'application'}}</span>
        <span id='application-out'>{{isTransitioningOut 'application'}}</span>
        <LinkTo id='link-application' @route='application'>App</LinkTo>
      </template>
    );

    assert.dom('#index-in').hasText('false');
    assert.dom('#index-out').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#slow-in').hasText('false');
    assert.dom('#slow-out').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-in');

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#index-in').hasText('false');
    assert.dom('#index-out').hasText('true');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#link-index').hasClass('ember-transitioning-out');

    assert.dom('#slow-in').hasText('true');
    assert.dom('#slow-out').hasText('false');
    assert.dom('#link-slow').hasClass('ember-transitioning-in');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-out');

    assert.dom('#about-in').hasText('false');
    assert.dom('#about-out').hasText('false');
    assert.dom('#link-about').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#link-about').doesNotHaveClass('ember-transitioning-out');

    assert.dom('#application-in').hasText('false', 'the application route stays active');
    assert.dom('#application-out').hasText('false', 'the application route stays active');
    assert.dom('#link-application').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#link-application').doesNotHaveClass('ember-transitioning-out');

    this.slowModel.resolve();
    await transition;
    await settled();

    assert.dom('#index-in').hasText('false');
    assert.dom('#index-out').hasText('false');
    assert.dom('#link-index').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#slow-in').hasText('false');
    assert.dom('#slow-out').hasText('false');
    assert.dom('#link-slow').doesNotHaveClass('ember-transitioning-in');
  });

  test('they use the models', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <span id='current-out'>{{isTransitioningOut 'post' '1'}}</span>
        <LinkTo id='link-current' @route='post' @model='1'>Post 1</LinkTo>

        <span id='named-out'>{{isTransitioningOut 'post' models=(Array.of '1')}}</span>

        <span id='other-out'>{{isTransitioningOut 'post' '2'}}</span>
        <LinkTo id='link-other' @route='post' @model='2'>Post 2</LinkTo>

        <span id='current-in'>{{isTransitioningIn 'post' '1'}}</span>
      </template>
    );

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#current-out').hasText('true');
    assert.dom('#link-current').hasClass('ember-transitioning-out');
    assert.dom('#named-out').hasText('true');
    assert.dom('#other-out').hasText('false');
    assert.dom('#link-other').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#current-in').hasText('false');

    this.slowModel.resolve();
    await transition;
    await settled();

    assert.dom('#current-out').hasText('false');
    assert.dom('#link-current').doesNotHaveClass('ember-transitioning-out');
  });

  test('they use the query params', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/search?q=ember');

    await render(
      <template>
        <span id='current-out'>
          {{isTransitioningOut 'search' queryParams=(hash q='ember')}}
        </span>
        <LinkTo id='link-current' @route='search' @query={{hash q='ember'}}>Ember</LinkTo>

        <span id='other-out'>
          {{isTransitioningOut 'search' queryParams=(hash q='glimmer')}}
        </span>
        <LinkTo id='link-other' @route='search' @query={{hash q='glimmer'}}>Glimmer</LinkTo>
      </template>
    );

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#current-out').hasText('true');
    assert.dom('#link-current').hasClass('ember-transitioning-out');
    assert.dom('#other-out').hasText('false');
    assert.dom('#link-other').doesNotHaveClass('ember-transitioning-out');

    this.slowModel.resolve();
    await transition;
    await settled();
  });

  test('they return false when the route or a model is missing', async function (assert) {
    let router = this.owner.lookup('service:router');

    await router.transitionTo('/posts/1');

    await render(
      <template>
        <span id='model-in'>{{isTransitioningIn 'post' null}}</span>
        <span id='model-out'>{{isTransitioningOut 'post' null}}</span>
        <LinkTo id='link-model' @route='post' @model={{null}}>Post</LinkTo>

        <span id='models-out'>{{isTransitioningOut 'post' models=(Array.of null)}}</span>

        <span id='route-in'>{{isTransitioningIn null}}</span>
        <span id='route-out'>{{isTransitioningOut null}}</span>
      </template>
    );

    let transition = router.transitionTo('/slow');
    await renderSettled();

    assert.dom('#model-in').hasText('false');
    assert.dom('#model-out').hasText('false');
    assert.dom('#link-model').doesNotHaveClass('ember-transitioning-in');
    assert.dom('#link-model').doesNotHaveClass('ember-transitioning-out');
    assert.dom('#models-out').hasText('false');
    assert.dom('#route-in').hasText('false');
    assert.dom('#route-out').hasText('false');

    this.slowModel.resolve();
    await transition;
    await settled();
  });

  test('{{isTransitioningIn}} does not accept positional models together with `models`', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isTransitioningIn 'post' '1' models='1'}}</template>),
      /You cannot provide both positional models and the `models` argument to the `isTransitioningIn` helper\./
    );
  });

  test('{{isTransitioningOut}} does not accept positional models together with `models`', async function (assert) {
    if (!DEBUG) {
      assert.expect(0);
      return;
    }

    await assert.rejects(
      render(<template>{{isTransitioningOut 'post' '1' models='1'}}</template>),
      /You cannot provide both positional models and the `models` argument to the `isTransitioningOut` helper\./
    );
  });
});

module('Router helpers: in an engine', function (hooks) {
  setupRenderingTest(hooks);
  setupRouter(hooks);

  test('the route state helpers resolve route names from the mount point', async function (assert) {
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

        <span id='loading'>{{isLoading 'post' null}}</span>
        <span id='in'>{{isTransitioningIn 'about'}}</span>
        <span id='out'>{{isTransitioningOut 'about'}}</span>
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
    assert.dom('#loading').hasText('true');
    assert.dom('#in').hasText('false');
    assert.dom('#out').hasText('false');

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

  test('the route state helpers are not supported in a routeless engine', async function (assert) {
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
