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
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import type Owner from '@ember/owner';
import templateOnly from '@ember/component/template-only';
import { setComponentTemplate } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

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
