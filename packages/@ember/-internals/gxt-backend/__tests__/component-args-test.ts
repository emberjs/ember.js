/**
 * Component arguments (compat, GXT_MODE).
 *
 * Glimmer semantics: a component argument is a reference that the component
 * reads where it uses it, whatever invoked the component:
 *
 * - a template-only component's argument updates when what it reads changes,
 *   for every template-only component rendered (each `{{#each}}` row), not
 *   only the last one;
 * - a template-only component reads `@value` as the argument's value in every
 *   position, also when it is invoked through a path
 *   (`<this.Apply @value={{this.greet}} />`), with `{{component}}` or curried:
 *   a modifier argument is installed where it is used in modifier position
 *   (`<div {{@value "x"}}>`), a helper argument is called (`{{@value "x"}}`)
 *   and an `{{on}}` handler argument is called;
 * - a `renderComponent` root argument is read as Glimmer's `getProp` reads it:
 *   a binding that reads `@a` runs again when `@a` changes (a `trackedObject`
 *   write, or `set()` on a plain args object), and not when another argument
 *   changes.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import {
  AbstractStrictTestCase,
  assertHTML,
  buildOwner,
  moduleFor,
  RenderingTestCase,
  runTask,
} from 'internal-test-helpers';
import { set } from '@ember/object';
import type Owner from '@ember/owner';
import { trackedObject } from '@ember/reactive/collections';
import { renderComponent, renderSettled } from '@ember/renderer';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';
import { associateDestroyableChild, destroy, registerDestructor } from '@glimmer/destroyable';
import { modifierCapabilities, setComponentTemplate, setModifierManager } from '@glimmer/manager';
import { tracked } from '@glimmer/tracking';

// A modifier definition whose manager records each install, with the first
// positional argument, in `calls`.
function recordingModifier(calls: string[]): object {
  class RecordingManager {
    capabilities = modifierCapabilities('3.22');
    createModifier() {
      return {};
    }
    installModifier(_state: object, _element: Element, args: { positional: unknown[] }) {
      calls.push(`install ${args.positional[0]}`);
    }
    updateModifier() {}
    destroyModifier() {}
  }
  return setModifierManager(() => new RecordingManager(), class {});
}

moduleFor(
  'GXT component arguments',
  class extends RenderingTestCase {
    ['@test an argument of a template-only component in an {{#each}} row updates']() {
      class Row {
        @tracked value: string;
        constructor(value: string) {
          this.value = value;
        }
      }
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('<p>{{@value}}</p>'), templateOnly())
      );
      let rows = [new Row('foo'), new Row('bar')];
      this.render('{{#each this.rows as |root|}}<FooBar @value={{root.value}} />{{/each}}', {
        rows,
      });
      this.assertText('foobar');

      runTask(() => (rows[0]!.value = 'qux'));
      this.assertText('quxbar', 'the first row updates');

      runTask(() => (rows[1]!.value = 'derp'));
      this.assertText('quxderp', 'the second row updates');
    }

    ['@test an argument of each of two template-only components updates']() {
      class Item {
        @tracked value: string;
        constructor(value: string) {
          this.value = value;
        }
      }
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('[{{@value}}]'), templateOnly())
      );
      let first = new Item('a');
      let second = new Item('b');
      this.render('<FooBar @value={{this.first.value}} /><FooBar @value={{this.second.value}} />', {
        first,
        second,
      });
      this.assertText('[a][b]');

      runTask(() => (first.value = 'c'));
      this.assertText('[c][b]', 'the first component updates');

      runTask(() => (second.value = 'd'));
      this.assertText('[c][d]', 'the second component updates');
    }

    ['@test a modifier argument of a component invoked through a path is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value "x"}}></div>'),
        templateOnly()
      );
      this.render('<this.Apply @value={{this.greet}} />', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a curried modifier argument of a component invoked through a path is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value}}></div>'),
        templateOnly()
      );
      this.render('<this.Apply @value={{modifier this.greet "x"}} />', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a modifier argument of a component invoked with {{component}} is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value "x"}}></div>'),
        templateOnly()
      );
      this.render('{{component this.Apply value=this.greet}}', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a modifier argument of a curried component is installed']() {
      let calls: string[] = [];
      let Apply = setComponentTemplate(
        precompileTemplate('<div {{@value "x"}}></div>'),
        templateOnly()
      );
      this.render('{{#let (component this.Apply) as |C|}}<C @value={{this.greet}} />{{/let}}', {
        Apply,
        greet: recordingModifier(calls),
      });
      this.assert.deepEqual(calls, ['install x']);
    }

    ['@test a helper argument of a component invoked through a path is called']() {
      let Show = setComponentTemplate(precompileTemplate('{{@value "x"}}'), templateOnly());
      this.render('<this.Show @value={{this.shout}} />', {
        Show,
        shout: (s: string) => s.toUpperCase(),
      });
      this.assertText('X');
    }

    ['@test an {{on}} handler argument of a component invoked through a path is called']() {
      let clicks = 0;
      let Button = setComponentTemplate(
        precompileTemplate('<button {{on "click" @onClick}}></button>'),
        templateOnly()
      );
      this.render('<this.Button @onClick={{this.count}} />', {
        Button,
        count: () => clicks++,
      });
      runTask(() => this.element.querySelector('button')!.click());
      this.assert.strictEqual(clicks, 1);
    }
  }
);

// Renders a template-only root reading `@a` and `@b` through `renderComponent`
// into the fixture, with an owner of its own; the render is destroyed after
// each test.
class RenderComponentTestCase extends AbstractStrictTestCase {
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);
    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element(): Element {
    return document.querySelector('#qunit-fixture')!;
  }

  async afterEach() {
    destroy(this);
    await renderSettled();
  }

  render(args: Record<string, unknown>): void {
    let Root = setComponentTemplate(
      precompileTemplate('<p>{{@a}}</p><p>{{@b}}</p>'),
      templateOnly()
    );
    let result = renderComponent(Root, { owner: this.owner, into: this.element, args });
    registerDestructor(this, () => result.destroy());
  }
}

moduleFor(
  'GXT renderComponent root arguments',
  class extends RenderComponentTestCase {
    async ['@test a binding that reads a root argument does not run when another one changes'](
      assert: QUnit['assert']
    ) {
      let reads = 0;
      let args = trackedObject({
        get a() {
          reads++;
          return 'a';
        },
        b: 1,
      });
      this.render(args);
      await renderSettled();
      assertHTML('<p>a</p><p>1</p>');
      let readsAfterRender = reads;

      args.b = 2;
      await renderSettled();
      assertHTML('<p>a</p><p>2</p>');
      assert.strictEqual(reads, readsAfterRender, '@a is not read again');
    }

    async ['@test a root argument set on a plain args object updates']() {
      let args = { a: 1, b: 1 };
      this.render(args);
      await renderSettled();
      assertHTML('<p>1</p><p>1</p>');

      runTask(() => set(args, 'a', 2));
      await renderSettled();
      assertHTML('<p>2</p><p>1</p>');
    }
  }
);
