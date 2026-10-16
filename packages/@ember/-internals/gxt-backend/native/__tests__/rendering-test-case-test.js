// gxt NATIVE layer: the classic test harness running natively —
// RenderingTestCase#render(templateString, context) through the native runtime
// compiler (native/runtime-compile.ts, NATIVE_FLAGS) and the native renderer,
// property-tag reads (set() / notifyPropertyChange() on untracked properties
// re-render), the template self (the context is the self, never a gxt render
// node), loose ApplicationTestCase route templates (`this` = the
// controller) and the runtime `template()` of @ember/template-compiler/runtime.
import Controller from '@ember/controller';
import { A as emberA } from '@ember/array';
import { isDestroyed } from '@ember/destroyable';
import EmberObject, { get, notifyPropertyChange, set } from '@ember/object';
import Route from '@ember/routing/route';
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { COMPONENT_ID_PROPERTY, RENDERED_NODES_PROPERTY } from '@lifeart/gxt';
import { ApplicationTestCase, RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

// gxt records a render node's tree id, rendered nodes and args on the
// NODE — never on the template's self.
function assertNotARenderNode(assert, self) {
  const own = (key) => Object.prototype.hasOwnProperty.call(self, key);
  assert.false(own(COMPONENT_ID_PROPERTY), 'no gxt tree id on the self');
  assert.false(own(RENDERED_NODES_PROPERTY), 'no gxt rendered nodes on the self');
  assert.false(own('args'), 'no gxt args on the self');
}

moduleFor(
  'gxt-native | RenderingTestCase',
  class extends RenderingTestCase {
    ['@test render(string, context): this-paths read the context; set() re-renders']() {
      this.render('<p>{{this.greeting}}, {{this.name}}!</p>', { greeting: 'Hello', name: 'world' });
      this.assertHTML('<p>Hello, world!</p>');
      this.assertStableRerender();

      runTask(() => set(this.context, 'name', 'Ember'));
      this.assertHTML('<p>Hello, Ember!</p>');

      runTask(() => set(this.context, 'greeting', 'Hi'));
      this.assertText('Hi, Ember!');
    }

    ['@test set() on a nested POJO path re-renders (property tags)']() {
      this.render('{{this.model.first}}-{{this.model.second}}', {
        model: { first: 'one', second: 'two' },
      });
      this.assertText('one-two');

      runTask(() => set(this.context, 'model.first', 'three'));
      this.assertText('three-two');

      runTask(() => set(this.context, 'model', { first: 'a', second: 'b' }));
      this.assertText('a-b');

      runTask(() => set(this.context, 'model.second', 'c'));
      this.assertText('a-c');
    }

    ['@test notifyPropertyChange on an untracked property re-renders']() {
      const pojo = { value: 'before' };
      this.render('{{this.pojo.value}}', { pojo });
      this.assertText('before');

      pojo.value = 'after';
      this.assertText('before', 'a plain write is not observed');
      runTask(() => notifyPropertyChange(pojo, 'value'));
      this.assertText('after');
    }

    ['@test unknownProperty is honoured (Glimmer getProp)']() {
      const proxyish = EmberObject.extend({
        unknownProperty(key) {
          return `<${key}>`;
        },
      }).create();
      this.render('{{this.obj.anything}} {{get this.obj "other"}}', { obj: proxyish });
      this.assertText('<anything> <other>');
    }

    ['@test the context is the template self, never a gxt render node'](assert) {
      this.render('{{this.label}}{{#if this.show}}<b>{{this.label}}</b>{{/if}}', {
        label: 'x',
        show: true,
      });
      this.assertHTML('x<b>x</b>');
      assertNotARenderNode(assert, this.context);
      runTask(() => set(this.context, 'show', false));
      this.assertHTML('x');
    }

    ['@test {{#each}} over a context array: replace + pushObject ([] tag)']() {
      this.render('{{#each this.list as |item|}}[{{item.name}}]{{/each}}', {
        list: emberA([{ name: 'a' }]),
      });
      this.assertText('[a]');

      runTask(() => this.context.list.pushObject({ name: 'b' }));
      this.assertText('[a][b]');

      runTask(() => set(this.context, 'list', emberA([{ name: 'z' }])));
      this.assertText('[z]');

      runTask(() => set(this.context.list[0], 'name', 'y'));
      this.assertText('[y]');
    }

    ['@test built-in helpers in a loose template']() {
      this.render(
        '{{concat this.a "-" this.b}} {{#let (hash x=this.a) as |h|}}{{h.x}}{{/let}} {{if this.flag "T" "F"}}',
        { a: 'A', b: 'B', flag: false }
      );
      this.assertText('A-B A F');
      runTask(() => {
        set(this.context, 'a', 'Z');
        set(this.context, 'flag', true);
      });
      this.assertText('Z-B Z T');
    }

    ['@test @tracked context state renders and updates']() {
      class State {
        @tracked count = 1;
      }
      const state = new State();
      this.render('{{this.state.count}}', { state });
      this.assertText('1');
      runTask(() => state.count++);
      this.assertText('2');
    }

    ['@test teardown destroys the context with the owner'](assert) {
      this.render('{{this.x}}', { x: 1 });
      const context = this.context;
      this.afterEach();
      assert.true(isDestroyed(context), 'context destroyed');
      assert.strictEqual(this.element.textContent, '', 'DOM removed');
      // afterEach runs again from the harness: it must be idempotent.
      this.component = null;
      this.owner = null;
    }
  }
);

moduleFor(
  'gxt-native | ApplicationTestCase: loose route templates (this = controller)',
  class extends ApplicationTestCase {
    async ['@test a loose route template reads its controller; set() re-renders'](assert) {
      this.add(
        'controller:index',
        class extends Controller {
          title = 'Index';
        }
      );
      this.add(
        'route:index',
        class extends Route {
          model() {
            return { count: 2 };
          }
        }
      );
      this.addTemplate('application', '<header>{{this.appName}}</header>{{outlet}}');
      this.addTemplate(
        'index',
        '<h1>{{this.title}}</h1><p>{{@model.count}} {{this.model.count}}</p>'
      );

      await this.visit('/');
      assert.strictEqual(this.element.querySelector('h1').textContent, 'Index');
      assert.strictEqual(this.element.querySelector('p').textContent, '2 2');

      const controller = this.applicationInstance.lookup('controller:index');
      runTask(() => set(controller, 'title', 'Changed'));
      assert.strictEqual(this.element.querySelector('h1').textContent, 'Changed');
      runTask(() => set(controller, 'model.count', 3));
      assert.strictEqual(this.element.querySelector('p').textContent, '3 3');
      assertNotARenderNode(assert, controller);
    }

    async ['@test loose templates across a transition'](assert) {
      this.router.map(function () {
        this.route('about');
      });
      this.add(
        'controller:about',
        class extends Controller {
          @service('session') session;
        }
      );
      this.add(
        'service:session',
        class extends Service {
          user = 'guest';
        }
      );
      this.addTemplate('index', '<h1 id="i">index</h1>');
      this.addTemplate('about', '<h1 id="a">about {{this.session.user}}</h1>');

      await this.visit('/');
      assert.ok(this.element.querySelector('#i'));
      await this.visit('/about');
      assert.notOk(this.element.querySelector('#i'), 'index torn down');
      assert.strictEqual(this.element.querySelector('#a').textContent, 'about guest');
      const session = this.applicationInstance.lookup('service:session');
      runTask(() => set(session, 'user', 'tomster'));
      assert.strictEqual(this.element.querySelector('#a').textContent, 'about tomster');
      assert.strictEqual(get(session, 'user'), 'tomster');
    }
  }
);
