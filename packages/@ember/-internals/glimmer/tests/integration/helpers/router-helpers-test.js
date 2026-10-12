import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import Engine from '@ember/engine';
import { array, hash } from '@ember/helper';
import { tracked } from '@glimmer/tracking';
import {
  moduleFor,
  ApplicationTestCase,
  ModuleBasedTestResolver,
  runTask,
} from 'internal-test-helpers';
import { compile } from 'internal-test-helpers/lib/compile';
import {
  LinkTo,
  urlFor,
  rootUrl,
  isActive,
  isLoading,
  isTransitioningIn,
  isTransitioningOut,
} from '@ember/routing';

const scope = () => ({
  LinkTo,
  array,
  hash,
  urlFor,
  rootUrl,
  isActive,
  isLoading,
  isTransitioningIn,
  isTransitioningOut,
});

function strictTemplate(source) {
  return compile(source, { strictMode: true, scope });
}

class RouterHelpersTestCase extends ApplicationTestCase {
  text(id) {
    return this.$(`#${id}`).text().trim();
  }

  href(id) {
    return this.$(`#${id}`)[0].getAttribute('href');
  }

  /**
    Each case renders `<LinkTo id="link-{id}">` with the same arguments as the helper.
    `<LinkTo>` is the reference implementation in RFC 391.

    @private
  */
  assertMatchesLinkTo(id, className, expected, message) {
    let { assert } = this;

    assert.strictEqual(this.text(id), String(expected), `helper: ${message}`);
    assert.strictEqual(this.$(`#link-${id}`).hasClass(className), expected, `LinkTo: ${message}`);
  }
}

moduleFor(
  'Router helpers: {{urlFor}}',
  class extends RouterHelpersTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
        this.route('post', { path: '/posts/:post_id' }, function () {
          this.route('comments');
          this.route('comment', { path: '/comments/:comment_id' });
        });
        this.route('search');
      });

      this.add(
        'controller:search',
        class extends Controller {
          queryParams = ['q', 'sort'];
          q = null;
          sort = 'asc';
        }
      );
    }

    async ['@test it generates the URL of a route without dynamic segments']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="about" href={{urlFor "about"}}>About</a>
          <a id="index" href={{urlFor "index"}}>Home</a>
        `)
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('about'), '/about');
      this.assert.strictEqual(this.href('index'), '/');
    }

    async ['@test it accepts the models as positional arguments']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="one" href={{urlFor "post" "42"}}>Post</a>
          <a id="two" href={{urlFor "post.comment" "42" "7"}}>Comment</a>
          <LinkTo id="link-two" @route="post.comment" @models={{array "42" "7"}}>Comment</LinkTo>
        `)
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('one'), '/posts/42');
      this.assert.strictEqual(this.href('two'), '/posts/42/comments/7');
      this.assert.strictEqual(this.href('link-two'), '/posts/42/comments/7');
    }

    async ['@test it accepts the models as the named argument `models`']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="single" href={{urlFor "post" models="42"}}>Post</a>
          <a id="list" href={{urlFor "post.comment" models=(array "42" "7")}}>Comment</a>
        `)
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('single'), '/posts/42');
      this.assert.strictEqual(this.href('list'), '/posts/42/comments/7');
    }

    async ['@test it does not accept positional models together with `models`']() {
      this.add(
        'template:index',
        strictTemplate(`<a id="link" href={{urlFor "post" "42" models="43"}}>Post</a>`)
      );

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'You cannot provide both positional models and the `models` argument to the `urlFor` helper.'
      );
    }

    async ['@test it does not accept a route name that is not a string']() {
      this.add('template:index', strictTemplate(`<a id="link" href={{urlFor 42}}>Post</a>`));

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'The route name of the `urlFor` helper must be a string.'
      );
    }

    async ['@test it does not accept `queryParams` that is not an object']() {
      this.add(
        'template:index',
        strictTemplate(`<a id="link" href={{urlFor "search" queryParams="q=ember"}}>Search</a>`)
      );

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'The `queryParams` argument to the `urlFor` helper must be an object.'
      );
    }

    async ['@test it uses a model object the same way `<LinkTo>` does']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="helper" href={{urlFor "post" this.post}}>Post</a>
          <LinkTo id="link-helper" @route="post" @model={{this.post}}>Post</LinkTo>
        `)
      );
      this.add(
        'controller:index',
        class extends Controller {
          post = { id: '42' };
        }
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('helper'), '/posts/42');
      this.assert.strictEqual(this.href('link-helper'), '/posts/42');
    }

    async ['@test it serializes the given query params']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="one" href={{urlFor "search" queryParams=(hash q="ember")}}>Search</a>
          <a id="model" href={{urlFor "post" "42" queryParams=(hash q="ember")}}>Post</a>
        `)
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('one'), '/search?q=ember');
      this.assert.strictEqual(this.href('model'), '/posts/42?q=ember');
    }

    async ['@test it does not serialize the default query params of the controller']() {
      this.add(
        'template:index',
        strictTemplate(`<a id="link" href={{urlFor "search"}}>Search</a>`)
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('link'), '/search');
    }

    async ['@test it returns no URL when the route or a model is missing']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="model" href={{urlFor "post" this.missing}}>Post</a>
          <a id="models" href={{urlFor "post.comment" models=(array "42" this.missing)}}>Comment</a>
          <a id="route" href={{urlFor this.missing}}>Unknown</a>
        `)
      );
      this.add(
        'controller:index',
        class extends Controller {
          missing = null;
        }
      );

      await this.visit('/');

      this.assert.strictEqual(this.href('model'), null);
      this.assert.strictEqual(this.href('models'), null);
      this.assert.strictEqual(this.href('route'), null);
    }

    async ['@test it updates when a model changes']() {
      this.add(
        'template:index',
        strictTemplate(`<a id="link" href={{urlFor "post" this.postId}}>Post</a>`)
      );
      this.add(
        'controller:index',
        class extends Controller {
          @tracked postId = null;
        }
      );

      await this.visit('/');
      this.assert.strictEqual(this.href('link'), null);

      let controller = this.controllerFor('index');

      runTask(() => (controller.postId = '1'));
      this.assert.strictEqual(this.href('link'), '/posts/1');

      runTask(() => (controller.postId = '2'));
      this.assert.strictEqual(this.href('link'), '/posts/2');
    }

    async ['@test it updates when the dynamic segments of the active routes change']() {
      this.add(
        'template:post',
        strictTemplate(`
          <a id="helper" href={{urlFor "post.comments"}}>Comments</a>
          <LinkTo id="link-helper" @route="post.comments">Comments</LinkTo>
          {{outlet}}
        `)
      );

      await this.visit('/posts/1');
      this.assert.strictEqual(this.href('helper'), '/posts/1/comments');
      this.assert.strictEqual(this.href('link-helper'), '/posts/1/comments');

      await this.visit('/posts/2');
      this.assert.strictEqual(this.href('helper'), '/posts/2/comments');
      this.assert.strictEqual(this.href('link-helper'), '/posts/2/comments');
    }
  }
);

moduleFor(
  'Router helpers: {{rootUrl}}',
  class extends RouterHelpersTestCase {
    async ['@test it returns the default rootURL']() {
      this.add('template:index', strictTemplate(`<span id="result">{{rootUrl}}</span>`));

      await this.visit('/');

      this.assert.strictEqual(this.text('result'), '/');
    }
  }
);

moduleFor(
  'Router helpers: with a custom rootURL',
  class extends RouterHelpersTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
        this.route('post', { path: '/posts/:post_id' });
      });
    }

    get routerOptions() {
      return { location: 'none', rootURL: '/app/' };
    }

    async ['@test {{rootUrl}} returns the rootURL of the router']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="result">{{rootUrl}}</span>
          <a id="link" href="{{(rootUrl)}}about">About</a>
        `)
      );

      await this.visit('/app/');

      this.assert.strictEqual(this.text('result'), '/app/');
      this.assert.strictEqual(this.href('link'), '/app/about');
    }

    async ['@test {{urlFor}} includes the rootURL']() {
      this.add(
        'template:index',
        strictTemplate(`
          <a id="index" href={{urlFor "index"}}>Home</a>
          <a id="about" href={{urlFor "about"}}>About</a>
          <a id="post" href={{urlFor "post" "42" queryParams=(hash q="ember")}}>Post</a>
          <LinkTo id="link-about" @route="about">About</LinkTo>
        `)
      );

      await this.visit('/app/');

      this.assert.strictEqual(this.href('index'), '/app/');
      this.assert.strictEqual(this.href('about'), '/app/about');
      this.assert.strictEqual(this.href('post'), '/app/posts/42?q=ember');
      this.assert.strictEqual(this.href('link-about'), '/app/about');
    }

    async ['@test {{isActive}} does not depend on the rootURL']() {
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="about">{{isActive "about"}}</span>
          <LinkTo id="link-about" @route="about">About</LinkTo>
        `)
      );

      await this.visit('/app/');
      this.assertMatchesLinkTo('about', 'active', false, 'about is not active on /app/');

      await this.visit('/app/about');
      this.assertMatchesLinkTo('about', 'active', true, 'about is active on /app/about');
    }
  }
);

moduleFor(
  'Router helpers: {{isActive}}',
  class extends RouterHelpersTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
        this.route('posts', function () {
          this.route('post', { path: '/:post_id' }, function () {
            this.route('comment', { path: '/comments/:comment_id' });
          });
        });
        this.route('search');
      });

      this.add(
        'controller:search',
        class extends Controller {
          queryParams = ['q', 'sort'];
          q = null;
          sort = 'asc';
        }
      );
    }

    async ['@test it matches the active class of `<LinkTo>` for routes without dynamic segments']() {
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="index">{{isActive "index"}}</span>
          <LinkTo id="link-index" @route="index">Home</LinkTo>

          <span id="about">{{isActive "about"}}</span>
          <LinkTo id="link-about" @route="about">About</LinkTo>

          <span id="application">{{isActive "application"}}</span>
          <LinkTo id="link-application" @route="application">App</LinkTo>
        `)
      );

      await this.visit('/');
      this.assertMatchesLinkTo('index', 'active', true, 'index on /');
      this.assertMatchesLinkTo('about', 'active', false, 'about on /');
      this.assertMatchesLinkTo('application', 'active', true, 'application on /');

      await this.visit('/about');
      this.assertMatchesLinkTo('index', 'active', false, 'index on /about');
      this.assertMatchesLinkTo('about', 'active', true, 'about on /about');
      this.assertMatchesLinkTo('application', 'active', true, 'application on /about');
    }

    async ['@test it matches the active class of `<LinkTo>` for parent and child routes']() {
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="posts">{{isActive "posts"}}</span>
          <LinkTo id="link-posts" @route="posts">Posts</LinkTo>

          <span id="posts-index">{{isActive "posts.index"}}</span>
          <LinkTo id="link-posts-index" @route="posts.index">Posts</LinkTo>

          <span id="post">{{isActive "posts.post" "1"}}</span>
          <LinkTo id="link-post" @route="posts.post" @model="1">Post 1</LinkTo>

          <span id="other-post">{{isActive "posts.post" "2"}}</span>
          <LinkTo id="link-other-post" @route="posts.post" @model="2">Post 2</LinkTo>

          <span id="comment">{{isActive "posts.post.comment" "1" "7"}}</span>
          <LinkTo id="link-comment" @route="posts.post.comment" @models={{array "1" "7"}}>
            Comment
          </LinkTo>

          <span id="other-comment">{{isActive "posts.post.comment" "2" "7"}}</span>
          <LinkTo id="link-other-comment" @route="posts.post.comment" @models={{array "2" "7"}}>
            Comment
          </LinkTo>
        `)
      );

      await this.visit('/posts');
      this.assertMatchesLinkTo('posts', 'active', true, 'posts on /posts');
      this.assertMatchesLinkTo('posts-index', 'active', true, 'posts.index on /posts');
      this.assertMatchesLinkTo('post', 'active', false, 'post 1 on /posts');
      this.assertMatchesLinkTo('other-post', 'active', false, 'post 2 on /posts');
      this.assertMatchesLinkTo('comment', 'active', false, 'comment 1/7 on /posts');

      await this.visit('/posts/1');
      this.assertMatchesLinkTo('posts', 'active', true, 'posts on /posts/1');
      this.assertMatchesLinkTo('posts-index', 'active', false, 'posts.index on /posts/1');
      this.assertMatchesLinkTo('post', 'active', true, 'post 1 on /posts/1');
      this.assertMatchesLinkTo('other-post', 'active', false, 'post 2 on /posts/1');
      this.assertMatchesLinkTo('comment', 'active', false, 'comment 1/7 on /posts/1');

      await this.visit('/posts/1/comments/7');
      this.assertMatchesLinkTo('posts', 'active', true, 'posts on the comment');
      this.assertMatchesLinkTo('post', 'active', true, 'post 1 on the comment');
      this.assertMatchesLinkTo('other-post', 'active', false, 'post 2 on the comment');
      this.assertMatchesLinkTo('comment', 'active', true, 'comment 1/7 on the comment');
      this.assertMatchesLinkTo('other-comment', 'active', false, 'comment 2/7 on the comment');

      await this.visit('/posts/2/comments/7');
      this.assertMatchesLinkTo('post', 'active', false, 'post 1 on the comment of post 2');
      this.assertMatchesLinkTo('other-post', 'active', true, 'post 2 on the comment of post 2');
      this.assertMatchesLinkTo('comment', 'active', false, 'comment 1/7 on comment 2/7');
      this.assertMatchesLinkTo('other-comment', 'active', true, 'comment 2/7 on comment 2/7');
    }

    async ['@test it accepts the models as the named argument `models`']() {
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="single">{{isActive "posts.post" models="1"}}</span>
          <span id="list">{{isActive "posts.post.comment" models=(array "1" "7")}}</span>
          <span id="other">{{isActive "posts.post.comment" models=(array "1" "8")}}</span>
        `)
      );

      await this.visit('/posts/1/comments/7');

      this.assert.strictEqual(this.text('single'), 'true');
      this.assert.strictEqual(this.text('list'), 'true');
      this.assert.strictEqual(this.text('other'), 'false');
    }

    async ['@test it does not accept positional models together with `models`']() {
      this.add(
        'template:index',
        strictTemplate(`<span id="result">{{isActive "posts.post" "1" models="1"}}</span>`)
      );

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'You cannot provide both positional models and the `models` argument to the `isActive` helper.'
      );
    }

    async ['@test it matches the active class of `<LinkTo>` for query params']() {
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="none">{{isActive "search"}}</span>
          <LinkTo id="link-none" @route="search">Search</LinkTo>

          <span id="ember">{{isActive "search" queryParams=(hash q="ember")}}</span>
          <LinkTo id="link-ember" @route="search" @query={{hash q="ember"}}>Ember</LinkTo>

          <span id="glimmer">{{isActive "search" queryParams=(hash q="glimmer")}}</span>
          <LinkTo id="link-glimmer" @route="search" @query={{hash q="glimmer"}}>Glimmer</LinkTo>

          <span id="default">{{isActive "search" queryParams=(hash sort="asc")}}</span>
          <LinkTo id="link-default" @route="search" @query={{hash sort="asc"}}>Asc</LinkTo>

          <span id="desc">{{isActive "search" queryParams=(hash sort="desc")}}</span>
          <LinkTo id="link-desc" @route="search" @query={{hash sort="desc"}}>Desc</LinkTo>

          <span id="both">{{isActive "search" queryParams=(hash q="ember" sort="asc")}}</span>
          <LinkTo id="link-both" @route="search" @query={{hash q="ember" sort="asc"}}>Both</LinkTo>
        `)
      );

      await this.visit('/search');
      this.assertMatchesLinkTo('none', 'active', true, 'no query params on /search');
      this.assertMatchesLinkTo('ember', 'active', false, 'q=ember on /search');
      this.assertMatchesLinkTo('default', 'active', true, 'default sort on /search');
      this.assertMatchesLinkTo('desc', 'active', false, 'sort=desc on /search');
      this.assertMatchesLinkTo('both', 'active', false, 'q=ember and default sort on /search');

      await this.visit('/search?q=ember');
      this.assertMatchesLinkTo('none', 'active', true, 'no query params on /search?q=ember');
      this.assertMatchesLinkTo('ember', 'active', true, 'q=ember on /search?q=ember');
      this.assertMatchesLinkTo('glimmer', 'active', false, 'q=glimmer on /search?q=ember');
      this.assertMatchesLinkTo('default', 'active', true, 'default sort on /search?q=ember');
      this.assertMatchesLinkTo('desc', 'active', false, 'sort=desc on /search?q=ember');
      this.assertMatchesLinkTo('both', 'active', true, 'q=ember and default sort');

      await this.visit('/search?q=glimmer&sort=desc');
      this.assertMatchesLinkTo('ember', 'active', false, 'q=ember after the change');
      this.assertMatchesLinkTo('glimmer', 'active', true, 'q=glimmer, the active sort is kept');
      this.assertMatchesLinkTo('desc', 'active', true, 'sort=desc, the active q is kept');
      this.assertMatchesLinkTo('default', 'active', false, 'default sort when sort is desc');
      this.assertMatchesLinkTo('both', 'active', false, 'q=ember and default sort');

      await this.visit('/about');
      this.assertMatchesLinkTo('none', 'active', false, 'no query params on /about');
      this.assertMatchesLinkTo('default', 'active', false, 'default sort on /about');
    }

    async ['@test it returns false when the route or a model is missing']() {
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="model">{{isActive "posts.post" this.missing}}</span>
          <LinkTo id="link-model" @route="posts.post" @model={{this.missing}}>Post</LinkTo>

          <span id="models">{{isActive "posts.post" models=(array this.missing)}}</span>
          <span id="route">{{isActive this.missing}}</span>
        `)
      );
      this.add(
        'controller:application',
        class extends Controller {
          missing = undefined;
        }
      );

      await this.visit('/posts/1');

      this.assertMatchesLinkTo('model', 'active', false, 'missing model');
      this.assert.strictEqual(this.text('models'), 'false');
      this.assert.strictEqual(this.text('route'), 'false');
    }

    async ['@test it updates when a model changes']() {
      this.add(
        'template:application',
        strictTemplate(`{{outlet}}<span id="result">{{isActive "posts.post" this.postId}}</span>`)
      );
      this.add(
        'controller:application',
        class extends Controller {
          @tracked postId = '2';
        }
      );

      await this.visit('/posts/1');
      this.assert.strictEqual(this.text('result'), 'false');

      let controller = this.controllerFor('application');

      runTask(() => (controller.postId = '1'));
      this.assert.strictEqual(this.text('result'), 'true');

      runTask(() => (controller.postId = null));
      this.assert.strictEqual(this.text('result'), 'false');
    }

    async ['@test it updates when the app leaves a loading substate']() {
      let deferred = RSVP.defer();

      this.add(
        'route:about',
        class extends Route {
          model() {
            return deferred.promise;
          }
        }
      );
      this.add('template:loading', strictTemplate(`<div id="loading"></div>`));
      this.add(
        'template:application',
        strictTemplate(`
          {{outlet}}
          <span id="about">{{isActive "about"}}</span>
          <LinkTo id="link-about" @route="about">About</LinkTo>

          <span id="index">{{isActive "index"}}</span>
          <LinkTo id="link-index" @route="index">Home</LinkTo>
        `)
      );

      await this.visit('/');
      this.assertMatchesLinkTo('about', 'active', false, 'about before the transition');
      this.assertMatchesLinkTo('index', 'active', true, 'index before the transition');

      let visit;
      runTask(() => (visit = this.visit('/about')));

      this.assert.strictEqual(this.$('#loading').length, 1, 'the loading substate is on screen');
      this.assertMatchesLinkTo('about', 'active', false, 'about in the loading substate');
      this.assertMatchesLinkTo('index', 'active', true, 'index in the loading substate');

      runTask(() => deferred.resolve());

      this.assertMatchesLinkTo('about', 'active', true, 'about after the transition');
      this.assertMatchesLinkTo('index', 'active', false, 'index after the transition');

      await visit;
    }
  }
);

moduleFor(
  'Router helpers: {{isLoading}}',
  class extends RouterHelpersTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('post', { path: '/posts/:post_id' }, function () {
          this.route('comment', { path: '/comments/:comment_id' });
        });
      });
    }

    async ['@test it returns false when the route and all models are present']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="route">{{isLoading "index"}}</span>
          <LinkTo id="link-route" @route="index">Home</LinkTo>

          <span id="model">{{isLoading "post" "42"}}</span>
          <LinkTo id="link-model" @route="post" @model="42">Post</LinkTo>

          <span id="models">{{isLoading "post.comment" "42" "7"}}</span>
          <span id="named">{{isLoading "post.comment" models=(array "42" "7")}}</span>
          <span id="named-single">{{isLoading "post" models="42"}}</span>
          <span id="query">{{isLoading "post" "42" queryParams=(hash q="ember")}}</span>
        `)
      );

      await this.visit('/');

      this.assertMatchesLinkTo('route', 'loading', false, 'route without models');
      this.assertMatchesLinkTo('model', 'loading', false, 'route with a model');
      this.assert.strictEqual(this.text('models'), 'false');
      this.assert.strictEqual(this.text('named'), 'false');
      this.assert.strictEqual(this.text('named-single'), 'false');
      this.assert.strictEqual(this.text('query'), 'false');
    }

    async ['@test it does not treat falsy values as missing']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="zero">{{isLoading "post" 0}}</span>
          <LinkTo id="link-zero" @route="post" @model={{0}}>Post</LinkTo>

          <span id="empty">{{isLoading "post" ""}}</span>
          <span id="false">{{isLoading "post" false}}</span>
          <span id="empty-route">{{isLoading ""}}</span>
        `)
      );

      await this.visit('/');

      this.assertMatchesLinkTo('zero', 'loading', false, 'the model 0');
      this.assert.strictEqual(this.text('empty'), 'false');
      this.assert.strictEqual(this.text('false'), 'false');
      this.assert.strictEqual(this.text('empty-route'), 'false');
    }

    async ['@test it returns true when a positional model is missing']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="null">{{isLoading "post" this.nullValue}}</span>
          <LinkTo id="link-null" @route="post" @model={{this.nullValue}}>Post</LinkTo>

          <span id="undefined">{{isLoading "post" this.undefinedValue}}</span>
          <LinkTo id="link-undefined" @route="post" @model={{this.undefinedValue}}>Post</LinkTo>

          <span id="first">{{isLoading "post.comment" this.nullValue "7"}}</span>
          <span id="last">{{isLoading "post.comment" "42" this.undefinedValue}}</span>
          <span id="query">{{isLoading "post" this.nullValue queryParams=(hash q="ember")}}</span>
        `)
      );
      this.add(
        'controller:index',
        class extends Controller {
          nullValue = null;
          undefinedValue = undefined;
        }
      );

      await this.visit('/');

      this.assertMatchesLinkTo('null', 'loading', true, 'null model');
      this.assertMatchesLinkTo('undefined', 'loading', true, 'undefined model');
      this.assert.strictEqual(this.text('first'), 'true');
      this.assert.strictEqual(this.text('last'), 'true');
      this.assert.strictEqual(this.text('query'), 'true');
    }

    async ['@test it returns true when a model in `models` is missing']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="list">{{isLoading "post.comment" models=(array "42" this.missing)}}</span>
          <LinkTo id="link-list" @route="post.comment" @models={{array "42" this.missing}}>
            Comment
          </LinkTo>

          <span id="single">{{isLoading "post" models=this.missing}}</span>
          <span id="query">
            {{isLoading "post" models=(array this.missing) queryParams=(hash q="ember")}}
          </span>
        `)
      );
      this.add(
        'controller:index',
        class extends Controller {
          missing = null;
        }
      );

      await this.visit('/');

      this.assertMatchesLinkTo('list', 'loading', true, 'missing model in the list');
      this.assert.strictEqual(this.text('single'), 'true');
      this.assert.strictEqual(this.text('query'), 'true');
    }

    async ['@test it returns true when the route is missing']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="null">{{isLoading this.nullValue}}</span>
          <LinkTo id="link-null" @route={{this.nullValue}}>Unknown</LinkTo>

          <span id="undefined">{{isLoading this.undefinedValue}}</span>
          <LinkTo id="link-undefined" @route={{this.undefinedValue}}>Unknown</LinkTo>
        `)
      );
      this.add(
        'controller:index',
        class extends Controller {
          nullValue = null;
          undefinedValue = undefined;
        }
      );

      await this.visit('/');

      this.assertMatchesLinkTo('null', 'loading', true, 'null route');
      this.assertMatchesLinkTo('undefined', 'loading', true, 'undefined route');
    }

    async ['@test it does not accept positional models together with `models`']() {
      this.add(
        'template:index',
        strictTemplate(`<span id="result">{{isLoading "post" "42" models="42"}}</span>`)
      );

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'You cannot provide both positional models and the `models` argument to the `isLoading` helper.'
      );
    }

    async ['@test it updates when a model changes']() {
      this.add(
        'template:index',
        strictTemplate(`
          <span id="positional">{{isLoading "post" this.postId}}</span>
          <span id="named">{{isLoading "post" models=(array this.postId)}}</span>
        `)
      );
      this.add(
        'controller:index',
        class extends Controller {
          @tracked postId = null;
        }
      );

      await this.visit('/');
      this.assert.strictEqual(this.text('positional'), 'true');
      this.assert.strictEqual(this.text('named'), 'true');

      let controller = this.controllerFor('index');

      runTask(() => (controller.postId = '42'));
      this.assert.strictEqual(this.text('positional'), 'false');
      this.assert.strictEqual(this.text('named'), 'false');

      runTask(() => (controller.postId = undefined));
      this.assert.strictEqual(this.text('positional'), 'true');
      this.assert.strictEqual(this.text('named'), 'true');
    }
  }
);

moduleFor(
  'Router helpers: {{isTransitioningIn}} and {{isTransitioningOut}}',
  class extends RouterHelpersTestCase {
    constructor(...args) {
      super(...args);

      this.router.map(function () {
        this.route('about');
        this.route('post', { path: '/posts/:post_id' });
        this.route('search');
        this.route('slow');
      });

      let deferred = (this.deferred = RSVP.defer());

      this.add(
        'route:slow',
        class extends Route {
          model() {
            return deferred.promise;
          }
        }
      );

      this.add(
        'controller:search',
        class extends Controller {
          queryParams = ['q'];
          q = null;
        }
      );
    }

    /**
      Renders the two helpers and a `<LinkTo>` for each case.

      The key is the element id. The value holds the arguments of the helper,
      then the arguments of `<LinkTo>`.

      @private
    */
    addCases(cases) {
      let source = '{{outlet}}';

      for (let [id, [helperArgs, linkArgs]] of Object.entries(cases)) {
        source += `
          <span id="in-${id}">{{isTransitioningIn ${helperArgs}}}</span>
          <span id="out-${id}">{{isTransitioningOut ${helperArgs}}}</span>
          <LinkTo id="link-${id}" ${linkArgs}>${id}</LinkTo>
        `;
      }

      this.add('template:application', strictTemplate(source));
    }

    assertTransitioning(id, { in: transitioningIn, out: transitioningOut }, message) {
      let { assert } = this;
      let link = this.$(`#link-${id}`);

      assert.strictEqual(this.text(`in-${id}`), String(transitioningIn), `in: ${message}`);
      assert.strictEqual(this.text(`out-${id}`), String(transitioningOut), `out: ${message}`);
      assert.strictEqual(
        link.hasClass('ember-transitioning-in'),
        transitioningIn,
        `LinkTo in: ${message}`
      );
      assert.strictEqual(
        link.hasClass('ember-transitioning-out'),
        transitioningOut,
        `LinkTo out: ${message}`
      );
    }

    async ['@test they match the classes of `<LinkTo>` during a transition']() {
      this.addCases({
        index: [`"index"`, `@route="index"`],
        about: [`"about"`, `@route="about"`],
        slow: [`"slow"`, `@route="slow"`],
        application: [`"application"`, `@route="application"`],
      });

      await this.visit('/');

      for (let id of ['index', 'about', 'slow', 'application']) {
        this.assertTransitioning(id, { in: false, out: false }, `${id} with no transition`);
      }

      let visit;
      runTask(() => (visit = this.visit('/slow')));

      this.assertTransitioning('index', { in: false, out: true }, 'index during the transition');
      this.assertTransitioning('slow', { in: true, out: false }, 'slow during the transition');
      this.assertTransitioning('about', { in: false, out: false }, 'about during the transition');
      this.assertTransitioning(
        'application',
        { in: false, out: false },
        'application stays active during the transition'
      );

      runTask(() => this.deferred.resolve());
      await visit;

      for (let id of ['index', 'about', 'slow', 'application']) {
        this.assertTransitioning(id, { in: false, out: false }, `${id} after the transition`);
      }
    }

    async ['@test they use the models']() {
      this.addCases({
        current: [`"post" "1"`, `@route="post" @model="1"`],
        other: [`"post" "2"`, `@route="post" @model="2"`],
        named: [`"post" models=(array "1")`, `@route="post" @models={{array "1"}}`],
        slow: [`"slow"`, `@route="slow"`],
      });

      await this.visit('/posts/1');

      let visit;
      runTask(() => (visit = this.visit('/slow')));

      this.assertTransitioning('current', { in: false, out: true }, 'the active post');
      this.assertTransitioning('named', { in: false, out: true }, 'the active post by `models`');
      this.assertTransitioning('other', { in: false, out: false }, 'a different post');
      this.assertTransitioning('slow', { in: true, out: false }, 'the target route');

      runTask(() => this.deferred.resolve());
      await visit;
    }

    async ['@test they use the query params']() {
      this.addCases({
        current: [
          `"search" queryParams=(hash q="ember")`,
          `@route="search" @query={{hash q="ember"}}`,
        ],
        other: [
          `"search" queryParams=(hash q="glimmer")`,
          `@route="search" @query={{hash q="glimmer"}}`,
        ],
      });

      await this.visit('/search?q=ember');

      let visit;
      runTask(() => (visit = this.visit('/slow')));

      this.assertTransitioning('current', { in: false, out: true }, 'the active query params');
      this.assertTransitioning('other', { in: false, out: false }, 'different query params');

      runTask(() => this.deferred.resolve());
      await visit;
    }

    async ['@test they return false when the route or a model is missing']() {
      this.addCases({
        model: [`"post" this.missing`, `@route="post" @model={{this.missing}}`],
        models: [
          `"post" models=(array this.missing)`,
          `@route="post" @models={{array this.missing}}`,
        ],
        route: [`this.missing`, `@route={{this.missing}}`],
      });
      this.add(
        'controller:application',
        class extends Controller {
          missing = null;
        }
      );

      await this.visit('/posts/1');

      let visit;
      runTask(() => (visit = this.visit('/slow')));

      this.assertTransitioning('model', { in: false, out: false }, 'missing model');
      this.assertTransitioning('models', { in: false, out: false }, 'missing model in `models`');
      this.assertTransitioning('route', { in: false, out: false }, 'missing route');

      runTask(() => this.deferred.resolve());
      await visit;
    }

    async ['@test {{isTransitioningIn}} does not accept positional models together with `models`']() {
      this.add(
        'template:index',
        strictTemplate(`<span>{{isTransitioningIn "post" "1" models="1"}}</span>`)
      );

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'You cannot provide both positional models and the `models` argument to the `isTransitioningIn` helper.'
      );
    }

    async ['@test {{isTransitioningOut}} does not accept positional models together with `models`']() {
      this.add(
        'template:index',
        strictTemplate(`<span>{{isTransitioningOut "post" "1" models="1"}}</span>`)
      );

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'You cannot provide both positional models and the `models` argument to the `isTransitioningOut` helper.'
      );
    }
  }
);

moduleFor(
  'Router helpers: in a routable engine',
  class extends RouterHelpersTestCase {
    constructor(...args) {
      super(...args);

      this.add(
        'engine:blog',
        class extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);

            this.register(
              'template:application',
              strictTemplate(`
                {{outlet}}
                <span id="about">{{isActive "about"}}</span>
                <LinkTo id="link-about" @route="about">About</LinkTo>

                <span id="index">{{isActive "index"}}</span>
                <LinkTo id="link-index" @route="index">Home</LinkTo>

                <span id="application">{{isActive "application"}}</span>
                <LinkTo id="link-application" @route="application">Blog</LinkTo>

                <span id="post">{{isActive "post" "1"}}</span>
                <LinkTo id="link-post" @route="post" @model="1">Post</LinkTo>

                <span id="loading">{{isLoading "post" this.missing}}</span>
                <span id="in">{{isTransitioningIn "about"}}</span>
                <span id="out">{{isTransitioningOut "about"}}</span>
              `)
            );
          }
        }
      );

      this.router.map(function () {
        this.route('about');
        this.mount('blog');
      });

      this.add('route-map:blog', function () {
        this.route('about');
        this.route('post', { path: '/posts/:post_id' });
      });
    }

    async ['@test the route state helpers resolve route names from the mount point of the engine']() {
      await this.visit('/blog');

      this.assertMatchesLinkTo('index', 'active', true, 'engine index on /blog');
      this.assertMatchesLinkTo('about', 'active', false, 'engine about on /blog');
      this.assertMatchesLinkTo('application', 'active', true, 'engine application on /blog');
      this.assertMatchesLinkTo('post', 'active', false, 'engine post on /blog');
      this.assert.strictEqual(this.text('loading'), 'true');
      this.assert.strictEqual(this.text('in'), 'false');
      this.assert.strictEqual(this.text('out'), 'false');

      await this.visit('/blog/about');

      this.assertMatchesLinkTo('index', 'active', false, 'engine index on /blog/about');
      this.assertMatchesLinkTo('about', 'active', true, 'engine about on /blog/about');
      this.assertMatchesLinkTo('application', 'active', true, 'engine application on /blog/about');

      await this.visit('/blog/posts/1');

      this.assertMatchesLinkTo('post', 'active', true, 'engine post on /blog/posts/1');
      this.assertMatchesLinkTo('about', 'active', false, 'engine about on /blog/posts/1');
    }
  }
);

moduleFor(
  'Router helpers: in a routeless engine',
  class extends RouterHelpersTestCase {
    async ['@test the route state helpers are not supported']() {
      this.add(
        'engine:widget',
        class extends Engine {
          Resolver = ModuleBasedTestResolver;

          init() {
            super.init(...arguments);

            this.register(
              'template:application',
              strictTemplate(`<span>{{isActive "about"}}</span>`)
            );
          }
        }
      );
      this.add('template:index', compile(`{{mount "widget"}}`));

      await this.assert.rejectsAssertion(
        this.visit('/'),
        'You attempted to use the `isActive` helper within a routeless engine, this is not supported.'
      );
    }
  }
);
