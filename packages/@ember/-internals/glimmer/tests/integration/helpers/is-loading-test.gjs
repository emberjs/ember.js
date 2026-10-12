import { DEBUG } from '@glimmer/env';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { hash } from '@ember/helper';
import { LinkTo, isLoading } from '@ember/routing';
import EmberRouter from '@ember/routing/router';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('post', { path: '/posts/:post_id' }, function () {
    this.route('comment', { path: '/comments/:comment_id' });
  });
});

class State {
  @tracked postId = '1';
}

module('Helpers test: {{isLoading}}', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', Router);
    this.owner.setupRouter();
  });

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
