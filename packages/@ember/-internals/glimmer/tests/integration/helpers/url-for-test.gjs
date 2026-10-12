import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import Controller from '@ember/controller';
import { hash } from '@ember/helper';
import { LinkTo, urlFor } from '@ember/routing';
import EmberRouter from '@ember/routing/router';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('about');
  this.route('search');
  this.route('post', { path: '/posts/:post_id' }, function () {
    this.route('comments');
    this.route('comment', { path: '/comments/:comment_id' });
  });
});

class RouterWithRootURL extends Router {
  rootURL = '/app/';
}

class SearchController extends Controller {
  queryParams = ['q', 'sort'];
  q = null;
  sort = 'asc';
}

class State {
  @tracked postId = '1';
}

module('Helpers test: {{urlFor}}', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', Router);
    this.owner.register('controller:search', SearchController);
    this.owner.setupRouter();
  });

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

module('Helpers test: {{urlFor}} with a custom rootURL', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', RouterWithRootURL);
    this.owner.register('controller:search', SearchController);
    this.owner.setupRouter();
  });

  test('it includes the rootURL', async function (assert) {
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
});
