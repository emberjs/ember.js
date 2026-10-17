/**
 * Values a template does not read are not read (compat, GXT_MODE).
 *
 * Glimmer reads a value when the render consumes it: a property when a
 * template's path reaches it, a `(hash)` member when the hash value is read,
 * a curried argument when the component reads it, a `(fn)` callback when the
 * function is called, a getter again when a tag it consumed changed (at the
 * revalidation, not inside the `set()` that dirtied the tag). A user getter
 * that throws or has a side effect therefore runs only when the template
 * reads it.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { ApplicationTestCase, moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import type Owner from '@ember/owner';
import EmberObject, { computed, defineProperty, set } from '@ember/object';
import Component from '@ember/component';
import Controller from '@ember/controller';
import templateOnly from '@ember/component/template-only';
import RoutingService from '@ember/routing/lib/routing-service';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

declare const expectNoWarning: (fn: () => void) => void;

moduleFor(
  'GXT reads: a value rendered as content',
  class extends RenderingTestCase {
    ["@test a plain object's getters do not run"](assert: QUnit['assert']) {
      let reads: string[] = [];
      let obj = {
        get boom() {
          reads.push('boom');
          return 1;
        },
      };

      this.render('{{this.obj}}|{{{this.obj}}}', { obj });
      this.assertText('[object Object]|[object Object]');
      assert.deepEqual(reads, [], 'no getter of the object ran');
    }

    ["@test an array's functions are not called"](assert: QUnit['assert']) {
      let calls: string[] = [];
      let fns = [
        function first() {
          calls.push('first');
        },
        () => {
          calls.push('arrow');
        },
      ];

      this.render('<p>{{{this.fns}}}</p>', { fns });
      assert.deepEqual(calls, [], 'no function of the array was called');
    }
  }
);

moduleFor(
  'GXT reads: curried component arguments',
  class extends RenderingTestCase {
    ['@test an argument the curried component does not read is not read'](assert: QUnit['assert']) {
      let reads: string[] = [];
      class Root extends GlimmerComponent {
        get named() {
          reads.push('named');
          return 1;
        }
        get positional() {
          reads.push('positional');
          return 2;
        }
      }
      this.owner.register(
        'component:x-lazy',
        setComponentTemplate(this.compile('lazy'), templateOnly())
      );
      this.owner.register(
        'component:root',
        setComponentTemplate(
          this.compile(
            '{{#let (component "x-lazy" named=this.named) as |C|}}<C />{{/let}}' +
              '{{#let (component "x-lazy" this.positional) as |U|}}{{/let}}'
          ),
          Root
        )
      );

      this.render('<Root />');
      this.assertText('lazy');
      assert.deepEqual(reads, [], 'no curried argument was read');
    }

    ['@test an argument the curried component reads updates'](assert: QUnit['assert']) {
      let root: Root | undefined;
      class Root extends GlimmerComponent {
        @tracked value = 'v1';
        constructor(owner: Owner, args: object) {
          super(owner, args);
          root = this;
        }
      }
      this.owner.register(
        'component:x-show',
        setComponentTemplate(this.compile('[{{@value}}]'), templateOnly())
      );
      this.owner.register(
        'component:root',
        setComponentTemplate(
          this.compile('{{#let (component "x-show" value=this.value) as |C|}}<C />{{/let}}'),
          Root
        )
      );

      this.render('<Root />');
      this.assertText('[v1]');

      runTask(() => (root!.value = 'v2'));
      this.assertText('[v2]');
      assert.ok(true);
    }
  }
);

moduleFor(
  'GXT reads: the fn helper',
  class extends RenderingTestCase {
    ['@test the callback is read when the function is called'](assert: QUnit['assert']) {
      let reads: string[] = [];
      let calls: unknown[] = [];
      class Root extends GlimmerComponent {
        get handler() {
          reads.push('handler');
          return (value: unknown) => calls.push(value);
        }
      }
      this.owner.register(
        'component:x-child',
        setComponentTemplate(
          this.compile('{{#if @onClick}}<button {{on "click" @onClick}}>has</button>{{/if}}'),
          templateOnly()
        )
      );
      this.owner.register(
        'component:root',
        setComponentTemplate(this.compile('<XChild @onClick={{fn this.handler 1}} />'), Root)
      );

      this.render('<Root />');
      this.assertText('has');
      assert.deepEqual(reads, [], 'the callback is not read before the call');

      runTask(() => (this.element.querySelector('button') as HTMLButtonElement).click());
      assert.deepEqual(calls, [1], 'the call reaches the callback');
      assert.deepEqual(reads, ['handler'], 'the call reads the callback');
    }
  }
);

moduleFor(
  'GXT reads: LinkTo',
  class extends ApplicationTestCase {
    async ['@test a tag dirtied inside set() re-reads no LinkTo binding there'](
      assert: QUnit['assert']
    ) {
      let calls: string[] = [];
      let counting = false;
      this.add(
        'service:-routing',
        class extends RoutingService {
          isActiveForRoute(...args: Parameters<RoutingService['isActiveForRoute']>) {
            if (counting) calls.push('isActiveForRoute');
            return super.isActiveForRoute(...args);
          }
          generateURL(...args: Parameters<RoutingService['generateURL']>) {
            if (counting) calls.push('generateURL');
            return super.generateURL(...args);
          }
        }
      );
      this.router.map(function (this: any) {
        this.route('about');
      });
      this.add(
        'template:index',
        precompileTemplate(`<LinkTo @route='about' id='about-link'>About</LinkTo>`)
      );

      await this.visit('/');
      let link = this.element.querySelector('#about-link') as HTMLAnchorElement;
      assert.strictEqual(link.getAttribute('href'), '/about');

      let other = EmberObject.create({ value: 1 });
      let inSet: string[] = [];
      runTask(() => {
        counting = true;
        set(other, 'value', 2);
        inSet = calls.slice();
      });
      counting = false;
      assert.deepEqual(inSet, [], 'the set() itself reads no LinkTo binding');
      assert.strictEqual(link.getAttribute('href'), '/about');
      assert.notOk(link.classList.contains('active'));
    }
  }
);

moduleFor(
  'GXT reads: the properties of a rendered component',
  class extends RenderingTestCase {
    ['@test a computed property the template does not read is not computed'](
      assert: QUnit['assert']
    ) {
      let reads: string[] = [];
      this.owner.register(
        'component:x-instance-cp',
        Component.extend({
          layout: this.compile('<p>{{this.label}}</p>'),
          label: 'ok',
          init() {
            this._super(...arguments);
            defineProperty(
              this,
              'unread',
              computed(function () {
                reads.push('unread');
                return { nested: true };
              })
            );
          },
        })
      );

      this.render('{{x-instance-cp}}');
      this.assertText('ok');
      assert.deepEqual(reads, [], 'the computed property is not computed');
    }
  }
);

moduleFor(
  'GXT reads: the arguments of an internal component',
  class extends RenderingTestCase {
    ['@test an argument the component does not read is not read'](assert: QUnit['assert']) {
      let reads: string[] = [];
      class Root extends GlimmerComponent {
        @tracked value = 'a';
        get unread() {
          reads.push('unread');
          return 1;
        }
      }
      let root: Root | undefined;
      this.owner.register(
        'component:root',
        setComponentTemplate(
          this.compile('<Input @value={{this.value}} @unread={{this.unread}} />'),
          class extends Root {
            constructor(owner: Owner, args: object) {
              super(owner, args);
              root = this;
            }
          }
        )
      );

      this.render('<Root />');
      let input = this.element.querySelector('input') as HTMLInputElement;
      assert.strictEqual(input.value, 'a');

      runTask(() => (root!.value = 'b'));
      assert.strictEqual(input.value, 'b');
      assert.deepEqual(reads, [], 'the argument is not read');
    }
  }
);

moduleFor(
  "GXT reads: a route template's controller",
  class extends ApplicationTestCase {
    async ['@test a getter the template does not read is not read'](assert: QUnit['assert']) {
      let reads: string[] = [];
      class ReadsController extends Controller {
        @tracked count = 1;
        get shown() {
          reads.push('shown');
          return `shown${this.count}`;
        }
        get unread() {
          reads.push('unread');
          return 'unread';
        }
      }
      this.add('controller:application', class extends ReadsController {});
      this.add('controller:index', class extends ReadsController {});
      this.add('template:application', precompileTemplate('[{{this.shown}}]{{outlet}}'));
      this.add('template:index', precompileTemplate('({{this.shown}})'));

      await this.visit('/');
      this.assertText('[shown1](shown1)');
      assert.notOk(reads.includes('unread'), 'rendering reads no other getter');

      let application = this.applicationInstance!.lookup('controller:application') as any;
      let index = this.applicationInstance!.lookup('controller:index') as any;
      runTask(() => {
        application.count = 2;
        index.count = 3;
      });
      this.assertText('[shown2](shown3)');
      assert.notOk(reads.includes('unread'), 'a change reads no other getter');
    }
  }
);

moduleFor(
  'GXT reads: a contextual component in a (hash)',
  class extends RenderingTestCase {
    ['@test reading its argument does not read it again'](assert: QUnit['assert']) {
      let reads = 0;
      class Root extends GlimmerComponent {
        get isOpen() {
          reads++;
          return true;
        }
      }
      this.owner.register(
        'component:x-open',
        setComponentTemplate(
          this.compile('{{if @isOpen "open" "closed"}}'),
          class extends GlimmerComponent {}
        )
      );
      this.owner.register(
        'component:root',
        setComponentTemplate(
          this.compile(
            '{{#let (hash open=(component "x-open" isOpen=this.isOpen)) as |thing|}}' +
              '{{#thing.open}}{{/thing.open}}{{/let}}'
          ),
          Root
        )
      );

      // A read that no template does is reported in DEBUG when it throws.
      expectNoWarning(() => this.render('<Root />'));
      this.assertText('open');
      assert.ok(reads <= 3, `the argument is read once per use (read ${reads} times)`);
    }
  }
);
