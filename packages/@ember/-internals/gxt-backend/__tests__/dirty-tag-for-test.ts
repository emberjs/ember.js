/**
 * Property tags dirtied with `dirtyTagFor` (compat, GXT_MODE).
 *
 * Glimmer semantics (@glimmer/validator): a template's read of `obj.key`
 * consumes the property's tag, `tagFor(obj, key)` (the global context's
 * `getProp`). `dirtyTagFor(obj, key)` invalidates that tag, and the bindings
 * that consumed it render the property's current value in the next render,
 * whatever kind of object `obj` is and whether or not the tag already existed
 * before the first render. Addons and data layers that keep their own state
 * use `tagFor` / `dirtyTagFor` directly, without `set()` or `@tracked`.
 *
 * The templates here are compiled at runtime, as an app's templates are.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { dirtyTagFor, tagFor } from '@glimmer/validator';
import { setComponentTemplate } from '@glimmer/manager';
import Component from '@glimmer/component';

// Changes `obj[key]` the way a data layer with its own storage does: a plain
// assignment, then the property's tag.
function write(obj: Record<string, unknown>, key: string, value: unknown): void {
  obj[key] = value;
  dirtyTagFor(obj, key);
}

moduleFor(
  'GXT dirtyTagFor',
  class extends RenderingTestCase {
    ['@test a text binding of a plain object property renders the value it is dirtied with']() {
      let obj = { name: 'a' };
      this.render('<p>{{this.obj.name}}</p>', { obj });
      this.assertHTML('<p>a</p>');

      runTask(() => write(obj, 'name', 'b'));
      this.assertHTML('<p>b</p>');

      runTask(() => write(obj, 'name', 'c'));
      this.assertHTML('<p>c</p>');
    }

    ['@test an attribute binding of a plain object property renders the value it is dirtied with']() {
      let obj = { title: 'a' };
      this.render('<p title={{this.obj.title}}></p>', { obj });
      this.assertHTML('<p title="a"></p>');

      runTask(() => write(obj, 'title', 'b'));
      this.assertHTML('<p title="b"></p>');
    }

    ['@test a block, a helper and a let binding of a plain object property update when it is dirtied']() {
      let obj = { show: true, name: 'a' };
      this.render(
        '{{#if this.obj.show}}yes{{else}}no{{/if}}|{{concat this.obj.name "!"}}|{{#let this.obj.name as |n|}}{{n}}{{/let}}',
        { obj }
      );
      this.assertText('yes|a!|a');

      runTask(() => {
        write(obj, 'show', false);
        write(obj, 'name', 'b');
      });
      this.assertText('no|b!|b');
    }

    ['@test an {{#each}} row renders the value its item is dirtied with']() {
      let items = [{ name: 'a' }, { name: 'b' }];
      this.render('{{#each this.items as |item|}}[{{item.name}}]{{/each}}', { items });
      this.assertText('[a][b]');

      runTask(() => write(items[0]!, 'name', 'A'));
      this.assertText('[A][b]');

      runTask(() => write(items[1]!, 'name', 'B'));
      this.assertText('[A][B]');
    }

    ['@test a property dirtied before the first render renders the value it is dirtied with after it']() {
      let obj = { name: 'a' };
      dirtyTagFor(obj, 'name');
      this.render('<p title={{this.obj.name}}>{{this.obj.name}}</p>', { obj });
      this.assertHTML('<p title="a">a</p>');

      runTask(() => write(obj, 'name', 'b'));
      this.assertHTML('<p title="b">b</p>');
    }

    ['@test a property of the template context dirtied before the first render renders the value it is dirtied with after it']() {
      this.render('<p title={{this.name}}>{{this.name}}</p>', {
        name: 'a',
        init(this: Record<string, unknown> & { _super(...args: unknown[]): void }) {
          this._super(...arguments);
          dirtyTagFor(this, 'name');
        },
      });
      this.assertHTML('<p title="a">a</p>');

      runTask(() => write(this.context, 'name', 'b'));
      this.assertHTML('<p title="b">b</p>');
    }

    ['@test a property of the template context whose tag was created before the first render renders the value it is dirtied with']() {
      this.render('<p title={{this.name}}>{{this.name}}</p>', {
        name: 'a',
        init(this: Record<string, unknown> & { _super(...args: unknown[]): void }) {
          this._super(...arguments);
          tagFor(this, 'name');
        },
      });
      this.assertHTML('<p title="a">a</p>');

      runTask(() => write(this.context, 'name', 'b'));
      this.assertHTML('<p title="b">b</p>');
    }

    ['@test a component field whose tag was created before the first render renders the value it is dirtied with']() {
      let probe!: Probe;
      class Probe extends Component {
        src = 'a.png';
        constructor(owner: object, args: object) {
          super(owner as never, args as never);
          tagFor(this, 'src');
          probe = this;
        }
      }
      this.owner.register(
        'component:tag-probe',
        setComponentTemplate(this.compile('<img src={{this.src}}>{{this.src}}'), Probe)
      );
      this.render('<TagProbe />');
      this.assertHTML('<img src="a.png">a.png');

      runTask(() => write(probe as unknown as Record<string, unknown>, 'src', 'b.png'));
      this.assertHTML('<img src="b.png">b.png');
    }

    ['@test a component field dirtied before the first render renders the value it is dirtied with after it']() {
      let probe!: Probe;
      class Probe extends Component {
        src = 'a.png';
        constructor(owner: object, args: object) {
          super(owner as never, args as never);
          // An addon's own storage, invalidated before anything rendered it.
          dirtyTagFor(this, 'src');
          probe = this;
        }
      }
      this.owner.register(
        'component:dirty-probe',
        setComponentTemplate(this.compile('<img src={{this.src}}>{{this.src}}'), Probe)
      );
      this.render('<DirtyProbe />');
      this.assertHTML('<img src="a.png">a.png');

      runTask(() => write(probe as unknown as Record<string, unknown>, 'src', 'b.png'));
      this.assertHTML('<img src="b.png">b.png');
    }
  }
);
