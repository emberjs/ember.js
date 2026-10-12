import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { rootUrl } from '@ember/routing';
import EmberRouter from '@ember/routing/router';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

class RouterWithRootURL extends Router {
  rootURL = '/app/';
}

module('Helpers test: {{rootUrl}}', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', Router);
    this.owner.setupRouter();
  });

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

module('Helpers test: {{rootUrl}} with a custom rootURL', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('router:main', RouterWithRootURL);
    this.owner.setupRouter();
  });

  test('it returns the rootURL of the router', async function (assert) {
    await render(
      <template>
        <span id='text'>{{rootUrl}}</span>
        <a id='attribute' href='{{(rootUrl)}}about'>About</a>
      </template>
    );

    assert.dom('#text').hasText('/app/');
    assert.dom('#attribute').hasAttribute('href', '/app/about');
  });
});
