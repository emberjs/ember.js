// gxt NATIVE layer: the router's outlet tree (native/outlet.ts) — a real
// Application booted through ApplicationTestCase (`visit`), STRICT route
// templates (`.gjs` <template> / component classes receiving @model /
// @controller), `{{outlet}}` compiled to `$_outlet(ctx)` (G3, EMBER_OUTLET).
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { captureRenderTree } from '@ember/debug';
import { registerDestructor } from '@ember/destroyable';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { ApplicationTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { textOf } from './-helpers';

function commentCount(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_COMMENT);
  let count = 0;
  while (walker.nextNode()) count++;
  return count;
}

// {type, name, children} of a captured render tree (gxt-internal keyword nodes
// such as `if` / `each` would show up by name too).
function shape(nodes) {
  return nodes.map(({ type, name, children }) => ({ type, name, children: shape(children) }));
}

moduleFor(
  'gxt-native | outlet',
  class extends ApplicationTestCase {
    async ['@test the application template renders the index route through {{outlet}}'](assert) {
      this.add(
        'template:application',
        <template><h1 class="app">App</h1><main>{{outlet}}</main></template>
      );
      this.add('template:index', <template><p class="index">Index</p></template>);

      await this.visit('/');

      assert.strictEqual(this.element.querySelector('h1.app').textContent, 'App');
      assert.strictEqual(textOf(this.element.querySelector('main')), 'Index');
    }

    async ['@test routes without a template render their child routes through the default {{outlet}}'](
      assert
    ) {
      this.router.map(function () {
        this.route('posts', function () {});
      });
      // no template:application, no template:posts
      this.add('template:posts.index', <template><p class="posts-index">all posts</p></template>);

      await this.visit('/posts');

      assert.strictEqual(textOf(this.element), 'all posts');
      assert.strictEqual(this.element.querySelectorAll('.posts-index').length, 1);
    }

    async ['@test leaving a route removes it; re-entering renders it again (no leaked anchors)'](
      assert
    ) {
      this.router.map(function () {
        this.route('about');
      });
      this.add('template:application', <template><main>{{outlet}}</main></template>);
      this.add('template:index', <template><p class="index">Index</p></template>);
      this.add('template:about', <template><p class="about">About</p></template>);

      await this.visit('/');
      assert.strictEqual(textOf(this.element), 'Index');
      const comments = commentCount(this.element);

      await this.visit('/about');
      assert.strictEqual(textOf(this.element), 'About');
      assert.strictEqual(this.element.querySelector('.index'), null, 'index torn down');

      await this.visit('/');
      assert.strictEqual(textOf(this.element), 'Index', 're-entry renders');
      assert.strictEqual(this.element.querySelector('.about'), null, 'about torn down');

      await this.visit('/about');
      await this.visit('/');
      assert.strictEqual(textOf(this.element), 'Index');
      assert.strictEqual(commentCount(this.element), comments, 'swaps leave no anchors behind');
    }

    async ['@test nested outlets; @model from model hooks; a stable route keeps its component and follows @model'](
      assert
    ) {
      this.router.map(function () {
        this.route('posts', function () {
          this.route('show', { path: '/:id' });
        });
      });
      this.add(
        'route:posts',
        class extends Route {
          model() {
            return [{ id: '1' }, { id: '2' }];
          }
        }
      );
      this.add(
        'route:posts.show',
        class extends Route {
          model({ id }) {
            // async model hook
            return Promise.resolve({ id, title: `Post ${id}` });
          }
        }
      );
      let created = 0;
      class PostShow extends Component {
        constructor(owner, args) {
          super(owner, args);
          created++;
        }
        <template><b class="post">{{@model.title}}</b></template>
      }
      this.add(
        'template:posts',
        <template><section class="posts">Posts({{@model.length}}): {{outlet}}</section></template>
      );
      this.add('template:posts.index', <template><i class="pick">pick one</i></template>);
      // a component CLASS as a route template
      this.add('template:posts.show', PostShow);

      await this.visit('/posts');
      assert.strictEqual(textOf(this.element), 'Posts(2): pick one');

      await this.visit('/posts/1');
      assert.strictEqual(textOf(this.element), 'Posts(2): Post 1');
      assert.strictEqual(this.element.querySelector('.pick'), null);
      assert.strictEqual(created, 1);

      await this.visit('/posts/2');
      assert.strictEqual(textOf(this.element), 'Posts(2): Post 2', '@model follows the state');
      assert.strictEqual(created, 1, 'same template + controller: the route component is kept');

      await this.visit('/posts');
      assert.strictEqual(textOf(this.element), 'Posts(2): pick one');
      assert.strictEqual(this.element.querySelector('.post'), null);
    }

    async ['@test leaving a route destroys the components its template rendered'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      let destructors = 0;
      let willDestroy = 0;
      class Widget extends Component {
        constructor(owner, args) {
          super(owner, args);
          registerDestructor(this, () => destructors++);
        }
        willDestroy() {
          willDestroy++;
          super.willDestroy();
        }
        <template><span class="widget">w</span></template>
      }
      this.add('template:index', <template><Widget /></template>);
      this.add('template:about', <template>about</template>);

      await this.visit('/');
      assert.strictEqual(this.element.querySelectorAll('.widget').length, 1);
      assert.strictEqual(destructors + willDestroy, 0);

      await this.visit('/about');
      assert.strictEqual(this.element.querySelector('.widget'), null);
      assert.strictEqual(destructors, 1, 'registerDestructor ran');
      assert.strictEqual(willDestroy, 1, 'willDestroy ran');

      await this.visit('/');
      assert.strictEqual(this.element.querySelectorAll('.widget').length, 1, 'a fresh widget');
      assert.strictEqual(destructors, 1);
    }

    async ['@test @controller state and query params re-render the route template'](assert) {
      class IndexController extends Controller {
        queryParams = ['page'];
        @tracked page = 1;
        @tracked title = 'hello';
      }
      this.add('controller:index', IndexController);
      this.add(
        'template:index',
        <template>
          <p class="title">{{@controller.title}}</p><p class="page">{{@controller.page}}</p>
        </template>
      );

      await this.visit('/');
      assert.strictEqual(this.element.querySelector('.title').textContent, 'hello');
      assert.strictEqual(this.element.querySelector('.page').textContent, '1');

      runTask(() => (this.controllerFor('index').title = 'changed'));
      assert.strictEqual(this.element.querySelector('.title').textContent, 'changed');

      await this.visit('/?page=3');
      assert.strictEqual(this.element.querySelector('.page').textContent, '3');
    }

    async ['@test {{outlet}} inside a component block (yield) renders the child route'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      const Layout = <template><div class="layout">{{yield}}</div></template>;
      this.add('template:application', <template><Layout>{{outlet}}</Layout></template>);
      this.add('template:index', <template><p class="index">Index</p></template>);
      this.add('template:about', <template><p class="about">About</p></template>);

      await this.visit('/');
      assert.strictEqual(textOf(this.element.querySelector('.layout')), 'Index');

      await this.visit('/about');
      assert.strictEqual(textOf(this.element.querySelector('.layout')), 'About');
    }

    async ['@test a block param named outlet shadows the {{outlet}} keyword'](assert) {
      this.add(
        'template:application',
        <template>{{#let "shadowed" as |outlet|}}<p class="p">{{outlet}}</p>{{/let}}</template>
      );
      this.add('template:index', <template><p class="index">Index</p></template>);

      await this.visit('/');
      assert.strictEqual(this.element.querySelector('.p').textContent, 'shadowed');
      assert.strictEqual(this.element.querySelector('.index'), null, 'no outlet rendered');
    }

    async ['@test debugRenderTree shows the outlets and the route nodes by name'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      this.add('template:application', <template><main>{{outlet}}</main></template>);
      this.add('template:index', <template>Index</template>);

      await this.visit('/');
      // The root outlet contributes no route node of its own (classic parity).
      const leaf = (name) => [
        {
          type: 'outlet',
          name: 'main',
          children: [
            {
              type: 'component',
              name: 'application',
              children: [{ type: 'outlet', name: 'main', children: name }],
            },
          ],
        },
      ];
      assert.deepEqual(
        shape(captureRenderTree(this.applicationInstance)),
        leaf([{ type: 'component', name: 'index', children: [] }])
      );

      // `about` has no template: the default {{outlet}} route template
      await this.visit('/about');
      assert.deepEqual(
        shape(captureRenderTree(this.applicationInstance)),
        leaf([
          {
            type: 'route-template',
            name: 'about',
            children: [{ type: 'outlet', name: 'main', children: [] }],
          },
        ])
      );
      const [top] = captureRenderTree(this.applicationInstance);
      const application = top.children[0];
      assert.strictEqual(
        application.args.named.controller,
        this.controllerFor('application'),
        'route nodes get @controller'
      );
    }

    async ['@test debugRenderTree: a loose route template is one route-template node holding its components'](
      assert
    ) {
      this.add(
        'template:application',
        precompileTemplate('<HelloWorld @name="first" />')
      );
      this.add(
        'component:hello-world',
        setComponentTemplate(precompileTemplate('{{@name}}'), templateOnly())
      );
      await this.visit('/');
      const [top] = shape(captureRenderTree(this.applicationInstance));
      assert.deepEqual(top, {
        type: 'outlet',
        name: 'main',
        children: [
          {
            type: 'route-template',
            name: 'application',
            children: [{ type: 'component', name: 'hello-world', children: [] }],
          },
        ],
      });
    }

    async ['@test destroying the application instance tears the outlet tree down'](assert) {
      let destructors = 0;
      class Widget extends Component {
        constructor(owner, args) {
          super(owner, args);
          registerDestructor(this, () => destructors++);
        }
        <template><span class="widget">w</span></template>
      }
      this.add('template:application', <template><main>{{outlet}}</main></template>);
      this.add('template:index', <template><Widget /></template>);

      await this.visit('/');
      assert.strictEqual(this.element.querySelectorAll('.widget').length, 1);

      runTask(() => this.applicationInstance.destroy());
      assert.strictEqual(this.element.querySelector('main'), null, 'DOM removed');
      assert.strictEqual(destructors, 1, 'route components destroyed');
    }

    async ['@test a build-time (G10) loose precompileTemplate route template renders with this = the controller'](
      assert
    ) {
      // `precompileTemplate(…)` is compiled by gxt at build time (G10); loose by
      // default, so `this` is the controller (G6) and free names resolve by name
      // (G11): `<Greeting>` is `component:greeting`.
      this.add(
        'controller:index',
        class extends Controller {
          title = 'Hello';
        }
      );
      this.add('template:index', precompileTemplate('<h1>{{this.title}}</h1><Greeting @who="you" />'));
      this.add(
        'component:greeting',
        setComponentTemplate(precompileTemplate('<p>hi {{@who}}</p>'), templateOnly())
      );

      await this.visit('/');

      assert.strictEqual(textOf(this.element.querySelector('h1')), 'Hello');
      assert.strictEqual(textOf(this.element.querySelector('p')), 'hi you');
    }

    async ['@test a precompileTemplate string that reaches runtime fails loudly when rendered'](
      assert
    ) {
      const source = '{{this.title}}'; // not a literal: gxt cannot compile it at build time
      this.add('template:index', precompileTemplate(source));

      await assert.rejects(
        this.visit('/'),
        /precompileTemplate: a template string reached runtime.*must be called with a static template string/s
      );
    }
  }
);
