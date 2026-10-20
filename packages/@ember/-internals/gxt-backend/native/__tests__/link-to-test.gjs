// gxt NATIVE layer: <LinkTo> — the REUSED classic LinkTo class rendered through
// the internal-component adapter (native/managers.ts) with the AOT layout
// native/templates/link-to.gts. Real applications (ApplicationTestCase `visit`)
// with STRICT `.gjs` route templates; active / href / transitioning state follow
// the router through router tags consumed by the native validator (gxt cells).
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import { Input, Textarea } from '@ember/component';
import { captureRenderTree } from '@ember/debug';
import { isDestroyed, registerDestructor } from '@ember/destroyable';
import { array, hash } from '@ember/helper';
import { LinkTo } from '@ember/routing';
import NoneLocation from '@ember/routing/none-location';
import Route from '@ember/routing/route';
import { RSVP } from '@ember/-internals/runtime';
import { ApplicationTestCase, moduleFor, runLoopSettled, runTask } from 'internal-test-helpers';
import { setupNativeRendering, textOf } from './-helpers';

const $ = (selector) => document.querySelector(`#qunit-fixture ${selector}`);
const hrefOf = (selector) => $(selector).getAttribute('href');
const hasClass = (selector, name) => $(selector).classList.contains(name);

function isActive(selector) {
  return hasClass(selector, 'active');
}

// Click `element` with `init` (a synthetic MouseEvent — modifier keys / button)
// and report whether LinkTo's handler prevented the default. A document-level
// listener (bubbling after the anchor's own `{{on 'click'}}`) records it and
// then prevents the browser's own navigation, so a pass-through click never
// leaves the test page (classic routing-angle-test `assertNav`).
async function clickAndObserve(element, init = {}) {
  let prevented = null;
  const guard = (event) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', guard);
  try {
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
    );
    await runLoopSettled();
  } finally {
    document.removeEventListener('click', guard);
  }
  return prevented;
}

function findNodes(nodes, name, found = []) {
  for (const node of nodes) {
    if (node.name === name) found.push(node);
    findNodes(node.children, name, found);
  }
  return found;
}

moduleFor(
  'gxt-native | LinkTo: href',
  class extends ApplicationTestCase {
    async ['@test static routes'](assert) {
      this.router.map(function () {
        this.route('about');
        this.route('deep', function () {
          this.route('inner');
        });
      });
      this.add(
        'template:application',
        <template>
          <LinkTo id="index-link" @route="index">Index</LinkTo>
          <LinkTo id="about-link" @route="about">About</LinkTo>
          <LinkTo id="deep-link" @route="deep">Deep</LinkTo>
          <LinkTo id="inner-link" @route="deep.inner">Inner</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');

      assert.strictEqual(hrefOf('#index-link'), '/');
      assert.strictEqual(hrefOf('#about-link'), '/about');
      assert.strictEqual(hrefOf('#deep-link'), '/deep', 'leaving off .index');
      assert.strictEqual(hrefOf('#inner-link'), '/deep/inner');
      assert.strictEqual($('#about-link').tagName, 'A');
      assert.strictEqual(textOf($('#about-link')), 'About', '{{yield}}');
    }

    async ['@test dynamic segments from @model (object, string, number) and @models'](assert) {
      this.router.map(function () {
        this.route('post', { path: '/post/:post_id' }, function () {
          this.route('comment', { path: '/comment/:comment_id' });
        });
      });
      const post = { id: 7, title: 'Seven' };
      const comment = { id: 'c3' };
      this.add(
        'template:application',
        <template>
          <LinkTo id="object" @route="post" @model={{post}}>object</LinkTo>
          <LinkTo id="string" @route="post" @model="five">string</LinkTo>
          <LinkTo id="number" @route="post" @model={{42}}>number</LinkTo>
          <LinkTo id="models" @route="post.comment" @models={{array post comment}}>m</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');

      assert.strictEqual(hrefOf('#object'), '/post/7');
      assert.strictEqual(hrefOf('#string'), '/post/five');
      assert.strictEqual(hrefOf('#number'), '/post/42');
      assert.strictEqual(hrefOf('#models'), '/post/7/comment/c3');
    }

    async ['@test @query: href with query params; default values are omitted'](assert) {
      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['page', 'sort'];
          page = 1;
          sort = 'asc';
        }
      );
      this.add(
        'template:application',
        <template>
          <LinkTo id="page2" @route="index" @query={{hash page=2}}>2</LinkTo>
          <LinkTo id="both" @route="index" @query={{hash page=3 sort="desc"}}>3</LinkTo>
          <LinkTo id="default" @route="index" @query={{hash page=1}}>1</LinkTo>
          <LinkTo id="no-route" @query={{hash sort="desc"}}>qp only</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');

      assert.strictEqual(hrefOf('#page2'), '/?page=2');
      assert.strictEqual(hrefOf('#both'), '/?page=3&sort=desc');
      assert.strictEqual(hrefOf('#default'), '/', 'default value omitted');
      assert.strictEqual(hrefOf('#no-route'), '/?sort=desc', 'current route + query');
      assert.true(isActive('#default'), 'default-valued query link is active');
      assert.false(isActive('#page2'));
    }

    async ['@test href follows argument changes; null models put the link in a loading state'](
      assert
    ) {
      this.router.map(function () {
        this.route('post', { path: '/post/:post_id' });
        this.route('about');
      });
      class State {
        @tracked route = 'post';
        @tracked postId = null;
      }
      const state = new State();
      this.add(
        'template:application',
        <template>
          <LinkTo id="dyn" @route={{state.route}} @model={{state.postId}}>dyn</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');

      assert.strictEqual(hrefOf('#dyn'), '#', 'loading: null model');
      assert.true(hasClass('#dyn', 'loading'));

      runTask(() => (state.postId = 1));
      assert.strictEqual(hrefOf('#dyn'), '/post/1');
      assert.false(hasClass('#dyn', 'loading'));

      runTask(() => (state.postId = 2));
      assert.strictEqual(hrefOf('#dyn'), '/post/2');

      runTask(() => {
        state.route = 'about';
        state.postId = undefined;
      });
      assert.strictEqual(hrefOf('#dyn'), '#', 'loading again: undefined model');

      await this.click('#dyn');
      assert.strictEqual(this.currentURL, '/', 'a loading link does not transition');
    }
  }
);

moduleFor(
  'gxt-native | LinkTo: active state',
  class extends ApplicationTestCase {
    async ['@test the active class follows transitions, incl. nested routes'](assert) {
      this.router.map(function () {
        this.route('about');
        this.route('posts', function () {
          this.route('show', { path: '/:id' });
        });
      });
      this.add(
        'template:application',
        <template>
          <LinkTo id="index" @route="index">Index</LinkTo>
          <LinkTo id="about" @route="about">About</LinkTo>
          <LinkTo id="posts" @route="posts">Posts</LinkTo>
          <LinkTo id="posts-index" @route="posts.index">All</LinkTo>
          <LinkTo id="post-1" @route="posts.show" @model="1">1</LinkTo>
          <LinkTo id="post-2" @route="posts.show" @model="2">2</LinkTo>
          {{outlet}}
        </template>
      );
      const active = () =>
        ['index', 'about', 'posts', 'posts-index', 'post-1', 'post-2'].filter((id) =>
          isActive(`#${id}`)
        );

      await this.visit('/');
      assert.deepEqual(active(), ['index']);

      await this.visit('/about');
      assert.deepEqual(active(), ['about']);

      await this.visit('/posts');
      assert.deepEqual(active(), ['posts', 'posts-index'], 'parent + index');

      await this.visit('/posts/1');
      assert.deepEqual(active(), ['posts', 'post-1'], 'parent stays active for a child route');

      await this.visit('/posts/2');
      assert.deepEqual(active(), ['posts', 'post-2'], 'same route, other model');

      await this.visit('/');
      assert.deepEqual(active(), ['index']);
      assert.strictEqual($('#index').className, 'ember-view active');
      assert.strictEqual($('#about').className, 'ember-view');
    }

    async ['@test @current-when: route names, space-separated lists, booleans, bound values'](
      assert
    ) {
      this.router.map(function () {
        this.route('items', function () {
          this.route('item');
        });
        this.route('about');
        this.route('other');
      });
      class State {
        @tracked currentWhen = 'about';
      }
      const state = new State();
      this.add(
        'template:application',
        <template>
          <LinkTo id="cw-items" @route="index" @current-when="items">a</LinkTo>
          <LinkTo id="cw-multi" @route="index" @current-when="about other">b</LinkTo>
          <LinkTo id="cw-true" @route="about" @current-when={{true}}>c</LinkTo>
          <LinkTo id="cw-false" @route="index" @current-when={{false}}>d</LinkTo>
          <LinkTo id="cw-bound" @route="index" @current-when={{state.currentWhen}}>e</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/items/item');
      assert.true(isActive('#cw-items'), 'nested child of current-when route');
      assert.false(isActive('#cw-multi'));
      assert.true(isActive('#cw-true'), 'current-when=true');
      assert.false(isActive('#cw-bound'));

      await this.visit('/');
      assert.false(isActive('#cw-false'), 'current-when=false wins over the matching route');
      assert.false(isActive('#cw-items'), 'current-when replaces the route match');

      await this.visit('/about');
      assert.true(isActive('#cw-multi'), 'first of a list');
      assert.true(isActive('#cw-bound'));

      await this.visit('/other');
      assert.true(isActive('#cw-multi'), 'second of a list');
      assert.false(isActive('#cw-bound'));

      runTask(() => (state.currentWhen = 'other'));
      assert.true(isActive('#cw-bound'), 'bound current-when re-evaluated');
    }

    async ['@test @activeClass (string, false)'](assert) {
      this.add(
        'template:application',
        <template>
          <LinkTo id="custom" @route="index" @activeClass="zomg-active">a</LinkTo>
          <LinkTo id="off" @route="index" @activeClass={{false}}>b</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');

      assert.true(hasClass('#custom', 'zomg-active'));
      assert.false(hasClass('#custom', 'active'));
      assert.strictEqual($('#off').className, 'ember-view', 'no active class at all');
    }

    async ['@test transitioning-in / transitioning-out classes while a transition is pending'](
      assert
    ) {
      const aboutDefer = RSVP.defer();
      this.router.map(function () {
        this.route('about');
        this.route('other');
      });
      this.add(
        'route:about',
        class extends Route {
          model() {
            return aboutDefer.promise;
          }
        }
      );
      this.add(
        'template:application',
        <template>
          <LinkTo id="index-link" @route="index">Index</LinkTo>
          <LinkTo id="about-link" @route="about">About</LinkTo>
          <LinkTo id="other-link" @route="other">Other</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');

      runTask(() => $('#about-link').click());

      assert.true(isActive('#index-link'), 'index still active');
      assert.true(hasClass('#index-link', 'ember-transitioning-out'));
      assert.true(hasClass('#about-link', 'ember-transitioning-in'));
      assert.false(isActive('#about-link'));
      assert.false(hasClass('#other-link', 'ember-transitioning-in'));
      assert.false(hasClass('#other-link', 'ember-transitioning-out'));

      runTask(() => aboutDefer.resolve());
      await runLoopSettled();

      assert.false(isActive('#index-link'));
      assert.true(isActive('#about-link'));
      for (const id of ['#index-link', '#about-link', '#other-link']) {
        assert.false(hasClass(id, 'ember-transitioning-in'), `${id} not transitioning in`);
        assert.false(hasClass(id, 'ember-transitioning-out'), `${id} not transitioning out`);
      }
    }

    async ['@test a query-param-only transition updates active state and hrefs'](assert) {
      this.add(
        'controller:index',
        class extends Controller {
          queryParams = ['page'];
          page = 1;
        }
      );
      this.add(
        'template:application',
        <template>
          <LinkTo id="p1" @route="index" @query={{hash page=1}}>1</LinkTo>
          <LinkTo id="p2" @route="index" @query={{hash page=2}}>2</LinkTo>
          <LinkTo id="plain" @route="index">plain</LinkTo>
          {{outlet}}
        </template>
      );

      await this.visit('/');
      assert.true(isActive('#p1'));
      assert.false(isActive('#p2'));

      await this.click('#p2');

      assert.strictEqual(this.currentURL, '/?page=2');
      assert.false(isActive('#p1'));
      assert.true(isActive('#p2'));
      assert.true(isActive('#plain'), 'a link without @query is active for any query params');
      assert.strictEqual(hrefOf('#plain'), '/?page=2', 'sticky query params in the href');
      assert.strictEqual(hrefOf('#p1'), '/');
    }
  }
);

moduleFor(
  'gxt-native | LinkTo: clicks',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.setURLs = 0;
      this.replaceURLs = 0;
      const testContext = this;
      this.add(
        'location:none',
        class extends NoneLocation {
          setURL(...args) {
            testContext.setURLs++;
            return super.setURL(...args);
          }
          replaceURL(...args) {
            testContext.replaceURLs++;
            return super.setURL(...args);
          }
        }
      );
      this.router.map(function () {
        this.route('about');
        this.route('post', { path: '/post/:post_id' });
      });
      this.add('template:index', <template><h3 class="home">Home</h3></template>);
      this.add('template:about', <template><h3 class="about">About</h3></template>);
      this.add('template:post', <template><h3 class="post">{{@model.title}}</h3></template>);
    }

    async ['@test a simple click transitions and prevents the default'](assert) {
      const post = { id: 9, title: 'Nine' };
      this.add(
        'template:application',
        <template>
          <LinkTo id="about-link" @route="about">About</LinkTo>
          <LinkTo id="post-link" @route="post" @model={{post}}>Post</LinkTo>
          {{outlet}}
        </template>
      );
      await this.visit('/');
      const set0 = this.setURLs;

      const prevented = await clickAndObserve($('#about-link'));

      assert.true(prevented, 'preventDefault called');
      assert.strictEqual(this.currentURL, '/about');
      assert.ok($('.about'), 'about rendered');
      assert.strictEqual($('.home'), null, 'index torn down');
      assert.strictEqual(this.setURLs, set0 + 1, 'setURL called once by the click');

      await this.click('#post-link');
      assert.strictEqual(this.currentURL, '/post/9');
      assert.strictEqual(textOf($('.post')), 'Nine', 'the model object is passed to the route');
    }

    async ['@test modifier keys, non-primary buttons and target=_blank pass through'](assert) {
      this.add(
        'template:application',
        <template>
          <LinkTo id="about-link" @route="about">About</LinkTo>
          <LinkTo id="blank-link" @route="about" target="_blank">Blank</LinkTo>
          <LinkTo id="self-link" @route="about" target="_self">Self</LinkTo>
          {{outlet}}
        </template>
      );
      await this.visit('/');

      for (const init of [
        { ctrlKey: true },
        { metaKey: true },
        { shiftKey: true },
        { altKey: true },
        { button: 1 },
      ]) {
        const prevented = await clickAndObserve($('#about-link'), init);
        assert.false(prevented, `${JSON.stringify(init)}: not prevented`);
        assert.strictEqual(this.currentURL, '/', `${JSON.stringify(init)}: no transition`);
      }

      assert.strictEqual($('#blank-link').getAttribute('target'), '_blank');
      assert.false(await clickAndObserve($('#blank-link')), 'target=_blank: not prevented');
      assert.strictEqual(this.currentURL, '/', 'target=_blank: no transition');

      assert.true(await clickAndObserve($('#self-link')), 'target=_self: prevented');
      assert.strictEqual(this.currentURL, '/about', 'target=_self: transitions');
    }

    async ['@test @replace uses replaceURL'](assert) {
      class State {
        @tracked replace = true;
      }
      const state = new State();
      this.add(
        'template:application',
        <template>
          <LinkTo id="replace-link" @route="about" @replace={{state.replace}}>About</LinkTo>
          <LinkTo id="home-link" @route="index" @replace={{state.replace}}>Home</LinkTo>
          {{outlet}}
        </template>
      );
      await this.visit('/');
      const set0 = this.setURLs;
      const replace0 = this.replaceURLs;

      await this.click('#replace-link');
      assert.strictEqual(this.currentURL, '/about');
      assert.strictEqual(this.replaceURLs, replace0 + 1, 'replaceURL called once');
      assert.strictEqual(this.setURLs, set0, 'setURL not called');

      runTask(() => (state.replace = false));
      await this.click('#home-link');
      assert.strictEqual(this.currentURL, '/');
      assert.strictEqual(this.setURLs, set0 + 1, 'bound falsy @replace: setURL');
      assert.strictEqual(this.replaceURLs, replace0 + 1);
    }

    async ['@test @disabled: disabled class, clicks are prevented but do not transition'](assert) {
      class State {
        @tracked disabled = true;
      }
      const state = new State();
      this.add(
        'template:application',
        <template>
          <LinkTo id="about-link" @route="about" @disabled={{state.disabled}}>About</LinkTo>
          <LinkTo
            id="custom"
            @route="about"
            @disabled={{true}}
            @disabledClass="do-not-want"
          >Custom</LinkTo>
          <LinkTo id="enabled" @route="about" @disabled={{false}}>Enabled</LinkTo>
          {{outlet}}
        </template>
      );
      await this.visit('/');

      assert.true(hasClass('#about-link', 'disabled'));
      assert.true(hasClass('#custom', 'do-not-want'));
      assert.false(hasClass('#custom', 'disabled'));
      assert.false(hasClass('#enabled', 'disabled'));

      assert.true(await clickAndObserve($('#about-link')), 'a disabled link prevents the default');
      assert.strictEqual(this.currentURL, '/', 'no transition while disabled');

      runTask(() => (state.disabled = false));
      assert.false(hasClass('#about-link', 'disabled'), 'bound @disabled re-evaluated');

      await this.click('#about-link');
      assert.strictEqual(this.currentURL, '/about', 'transitions once enabled');
    }
  }
);

moduleFor(
  'gxt-native | LinkTo: component',
  class extends ApplicationTestCase {
    async ['@test every invocation is its own instance: distinct ids and hrefs'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      this.add(
        'template:application',
        <template>
          <LinkTo @route="index" class="one">Home</LinkTo>
          <LinkTo @route="about" class="two">About</LinkTo>
          {{outlet}}
        </template>
      );
      await this.visit('/');

      const [one, two] = document.querySelectorAll('#qunit-fixture a');
      assert.ok(one.id && two.id, 'default ids');
      assert.notStrictEqual(one.id, two.id, 'distinct ids');
      assert.strictEqual(one.getAttribute('href'), '/');
      assert.strictEqual(two.getAttribute('href'), '/about');
      assert.true(one.classList.contains('active'));
      assert.false(two.classList.contains('active'));

      const links = findNodes(captureRenderTree(this.applicationInstance), 'LinkTo');
      assert.strictEqual(links.length, 2, 'two LinkTo render nodes');
      assert.notStrictEqual(links[0].instance, links[1].instance, 'two instances');
      assert.strictEqual(links[0].instance.id, one.id, 'the default id is the instance guid');
      assert.strictEqual(links[0].type, 'component');
      assert.deepEqual(links[0].args, { positional: [], named: { route: 'index' } });
      assert.deepEqual(links[1].args, { positional: [], named: { route: 'about' } });
    }

    async ['@test ...attributes: classes merge, attributes before override, href wins'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      this.add(
        'template:application',
        <template>
          <LinkTo
            @route="about"
            id="custom-id"
            class="nav-link"
            title="About us"
            rel="nofollow"
            tabindex="3"
            role="menuitem"
            data-test-about
            href="/overridden"
          >About</LinkTo>
          {{outlet}}
        </template>
      );
      await this.visit('/');

      const a = $('[data-test-about]');
      assert.strictEqual(a.id, 'custom-id', 'invocation id overrides the default id');
      assert.strictEqual(a.className, 'ember-view nav-link', 'classes merge in source order');
      assert.strictEqual(a.getAttribute('title'), 'About us');
      assert.strictEqual(a.getAttribute('rel'), 'nofollow');
      assert.strictEqual(a.getAttribute('tabindex'), '3');
      assert.strictEqual(a.getAttribute('role'), 'menuitem');
      assert.strictEqual(a.getAttribute('href'), '/about', 'href after ...attributes wins');

      await this.visit('/about');
      assert.strictEqual(a.className, 'ember-view active nav-link');
    }

    async ['@test a LinkTo in a route template is destroyed when the route exits'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      this.add(
        'template:application',
        <template><LinkTo class="app-link" @route="about">About</LinkTo>{{outlet}}</template>
      );
      this.add(
        'template:index',
        <template><LinkTo class="index-link" @route="about">a</LinkTo></template>
      );
      this.add('template:about', <template><p class="about">about</p></template>);

      await this.visit('/');
      const [appNode, indexNode] = findNodes(captureRenderTree(this.applicationInstance), 'LinkTo');
      assert.strictEqual(appNode.instance.id, $('.app-link').id, 'node instance = rendered link');
      assert.strictEqual(indexNode.instance.id, $('.index-link').id);
      const destroyed = [];
      registerDestructor(appNode.instance, () => destroyed.push('app'));
      registerDestructor(indexNode.instance, () => destroyed.push('index'));

      await this.click('.index-link');

      assert.strictEqual(this.currentURL, '/about');
      assert.strictEqual($('.index-link'), null, 'removed from the DOM');
      assert.deepEqual(destroyed, ['index'], 'only the exited route link is destroyed');
      assert.true(isDestroyed(indexNode.instance), 'isDestroyed');
      assert.false(isDestroyed(appNode.instance));
      assert.true(isActive('.app-link'), 'the remaining link still reacts');
      assert.strictEqual(
        findNodes(captureRenderTree(this.applicationInstance), 'LinkTo').length,
        1,
        'one LinkTo node left'
      );
    }

    async ['@test LinkTo in {{#each}}, with a reactive block and a component wrapper'](assert) {
      this.router.map(function () {
        this.route('about');
        this.route('other');
      });
      class State {
        @tracked label = 'go';
      }
      const state = new State();
      const routes = ['index', 'about', 'other'];
      class Nav extends Component {
        <template>
          <nav>{{#each @routes as |r|}}<LinkTo class="r" @route={{r}}>{{r}} {{state.label}}</LinkTo>{{/each}}</nav>
        </template>
      }
      this.add('template:application', <template><Nav @routes={{routes}} />{{outlet}}</template>);

      await this.visit('/about');

      const links = [...document.querySelectorAll('#qunit-fixture a.r')];
      assert.deepEqual(
        links.map((a) => a.getAttribute('href')),
        ['/', '/about', '/other']
      );
      assert.deepEqual(
        links.map((a) => a.classList.contains('active')),
        [false, true, false]
      );
      assert.strictEqual(textOf(links[1]), 'about go');

      runTask(() => (state.label = 'now'));
      assert.strictEqual(textOf(links[1]), 'about now', 'block content updates in place');

      await this.click(links[2]);
      assert.strictEqual(this.currentURL, '/other');
      assert.deepEqual(
        links.map((a) => a.classList.contains('active')),
        [false, false, true]
      );
    }

    async ['@test a curried LinkTo (component LinkTo route=...)'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      this.add(
        'template:application',
        <template>
          {{#let (component LinkTo route="about") as |AboutLink|}}
            <AboutLink id="curried" class="c">About</AboutLink>
          {{/let}}
          {{outlet}}
        </template>
      );
      await this.visit('/');

      assert.strictEqual(hrefOf('#curried'), '/about');
      assert.true(hasClass('#curried', 'c'));
      await this.click('#curried');
      assert.strictEqual(this.currentURL, '/about');
      assert.true(isActive('#curried'));
    }
  }
);

QUnit.module('gxt-native | LinkTo: without a started router; legacy drops', function (hooks) {
  setupNativeRendering(hooks);

  QUnit.test('renders before the initial transition (href from the default location)', function (assert) {
    this.render(<template><LinkTo @route="index" class="x">Go to Index</LinkTo></template>);

    const a = this.element.querySelector('a.x');
    assert.strictEqual(a.getAttribute('href'), '#/');
    assert.strictEqual(textOf(a), 'Go to Index');
    assert.false(a.classList.contains('active'), 'no current state yet');
  });

  QUnit.test('invoking it wrong throws the classic assertions', function (assert) {
    assert.throws(
      () => this.render(<template><LinkTo>nothing</LinkTo></template>),
      /You must provide at least one of the `@route`, `@model`, `@models` or `@query` arguments to `<LinkTo>`/
    );
  });

  QUnit.test('<Input> / <Textarea> fail with the documented-drop message', function (assert) {
    assert.throws(
      () => this.render(<template><Input @value="x" /></template>),
      /`<Input>` is not supported by the gxt-native build \(documented legacy drop\)\. Use a plain <input> with \{\{on "input"\}\} instead\./
    );
    this.element.innerHTML = '';
    assert.throws(
      () => this.render(<template><Textarea @value="x" /></template>),
      /`<Textarea>` is not supported by the gxt-native build \(documented legacy drop\)/
    );
  });
});
