/**
 * The debug render tree of `renderComponent` roots (compat, GXT_MODE).
 *
 * Glimmer semantics (@glimmer/runtime debug-render-tree.ts), with the debug
 * render tree on (DEBUG builds, `ENV._DEBUG_RENDER_TREE`):
 *
 * - a component is a node under the node of the component whose template
 *   rendered it, with its name, the arguments it reads now, its instance and
 *   its bounds;
 * - a component that a block renders after its template rendered (an `{{#if}}`
 *   branch, an `{{#each}}` row) is a node of the component whose template has
 *   the block, and leaves the tree with the block;
 * - a modifier is a node of the component whose template renders its element,
 *   with the element as its bounds.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { AbstractStrictTestCase, buildOwner, moduleFor } from 'internal-test-helpers';
import type Owner from '@ember/owner';
import { captureRenderTree } from '@ember/debug';
import { trackedObject } from '@ember/reactive/collections';
import { renderComponent, renderSettled } from '@ember/renderer';
import { run } from '@ember/runloop';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';
import GlimmerComponent from '@glimmer/component';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import type { CapturedRenderNode } from '@glimmer/interfaces';
import { modifierCapabilities, setComponentTemplate, setModifierManager } from '@glimmer/manager';

interface DomBounds {
  parentElement: Node;
  firstNode: Node;
  lastNode: Node;
}

function boundsOf(node: CapturedRenderNode | undefined): DomBounds | null | undefined {
  return node?.bounds as unknown as DomBounds | null | undefined;
}

// The nodes as `name(children)`, a modifier as `modifier:name`.
function shape(nodes: CapturedRenderNode[]): string[] {
  return nodes.map((node) => {
    let name = node.type === 'component' ? node.name : `${node.type}:${node.name}`;
    return node.children.length > 0 ? `${name}(${shape(node.children).join(',')})` : name;
  });
}

class DebugRenderTreeTestCase extends AbstractStrictTestCase {
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);
    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element(): Element {
    return document.querySelector('#qunit-fixture')!;
  }

  // Render `component` into a new element in the fixture.
  renderInto(component: object): HTMLElement {
    let element = document.createElement('div');
    this.element.append(element);
    let result = renderComponent(component, { owner: this.owner, into: element });
    registerDestructor(this, () => result.destroy());
    return element;
  }

  // The nodes under the `{ROOT}` node of the one render.
  rootChildren(): CapturedRenderNode[] {
    let roots = captureRenderTree(this.owner);
    this.assert.strictEqual(roots.length, 1, 'the render is the one root node');
    return roots[0]?.children ?? [];
  }
}

moduleFor(
  'GXT debug render tree',
  class extends DebugRenderTreeTestCase {
    ['@test a component is a node of the component whose template rendered it'](
      assert: QUnit['assert']
    ) {
      let Inner = setComponentTemplate(
        precompileTemplate('<span>{{@value}}</span>'),
        templateOnly()
      );
      let Outer = setComponentTemplate(
        precompileTemplate('<p><Inner @value={{@name}} /></p>', {
          strictMode: true,
          scope: () => ({ Inner }),
        }),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('<Outer @name="outer" />', {
          strictMode: true,
          scope: () => ({ Outer }),
        }),
        templateOnly()
      );

      let element = this.renderInto(Root);

      assert.deepEqual(shape(this.rootChildren()), ['Outer(Inner)'], 'the tree');

      let outer = this.rootChildren()[0];
      let p = element.querySelector('p')!;
      assert.strictEqual(outer?.name, 'Outer', 'a component is named by its scope');
      assert.deepEqual(outer?.args, { positional: [], named: { name: 'outer' } }, 'its arguments');
      assert.strictEqual(outer?.instance, null, 'a template-only component has no instance');
      assert.strictEqual(boundsOf(outer)?.parentElement, element, 'the parent of its nodes');
      assert.strictEqual(boundsOf(outer)?.firstNode, p, 'its first node');
      assert.strictEqual(boundsOf(outer)?.lastNode, p, 'its last node');

      let inner = outer?.children[0];
      let span = element.querySelector('span')!;
      assert.deepEqual(inner?.args, { positional: [], named: { value: 'outer' } }, 'its arguments');
      assert.strictEqual(boundsOf(inner)?.parentElement, p, 'the parent of its nodes');
      assert.strictEqual(boundsOf(inner)?.firstNode, span, 'its first node');
      assert.strictEqual(boundsOf(inner)?.lastNode, span, 'its last node');
    }

    async ['@test a component an {{#if}} branch renders later is a node of the component whose template has the branch'](
      assert: QUnit['assert']
    ) {
      let state = trackedObject({ shown: false });
      let Inner = setComponentTemplate(precompileTemplate('<span>inner</span>'), templateOnly());
      let Outer = setComponentTemplate(
        precompileTemplate('{{#if state.shown}}<Inner />{{/if}}', {
          strictMode: true,
          scope: () => ({ Inner, state }),
        }),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('<Outer />', { strictMode: true, scope: () => ({ Outer }) }),
        templateOnly()
      );

      this.renderInto(Root);
      assert.deepEqual(shape(this.rootChildren()), ['Outer'], 'the branch renders nothing');

      run(() => (state.shown = true));
      await renderSettled();
      assert.deepEqual(shape(this.rootChildren()), ['Outer(Inner)'], 'the branch rendered Inner');

      run(() => (state.shown = false));
      await renderSettled();
      assert.deepEqual(shape(this.rootChildren()), ['Outer'], 'Inner left with the branch');
    }

    async ['@test the components of {{#each}} rows leave the tree with their rows'](
      assert: QUnit['assert']
    ) {
      let state = trackedObject({ items: ['a'] });
      let Inner = setComponentTemplate(precompileTemplate('<i>{{@value}}</i>'), templateOnly());
      let Outer = setComponentTemplate(
        precompileTemplate('{{#each state.items as |item|}}<Inner @value={{item}} />{{/each}}', {
          strictMode: true,
          scope: () => ({ Inner, state }),
        }),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('<Outer />', { strictMode: true, scope: () => ({ Outer }) }),
        templateOnly()
      );
      let values = () =>
        (this.rootChildren()[0]?.children ?? []).map((node) => node.args.named['value']);

      this.renderInto(Root);
      assert.deepEqual(values(), ['a'], 'one row');

      run(() => (state.items = ['a', 'b']));
      await renderSettled();
      assert.deepEqual(values(), ['a', 'b'], 'a row added later is a child of Outer');

      run(() => (state.items = ['b']));
      await renderSettled();
      assert.deepEqual(values(), ['b'], 'a removed row left the tree');
    }

    async ['@test a Glimmer component is listed with its instance and the arguments it reads now'](
      assert: QUnit['assert']
    ) {
      let state = trackedObject({ name: 'a' });
      class Greeting extends GlimmerComponent<{ Args: { name: string } }> {}
      setComponentTemplate(precompileTemplate('<b>{{@name}}</b>'), Greeting);
      let Root = setComponentTemplate(
        precompileTemplate('<Greeting @name={{state.name}} />', {
          strictMode: true,
          scope: () => ({ Greeting, state }),
        }),
        templateOnly()
      );

      this.renderInto(Root);
      let greeting = this.rootChildren()[0];
      assert.strictEqual(greeting?.name, 'Greeting', 'its name');
      assert.ok(greeting?.instance instanceof Greeting, 'its instance is the component');
      assert.deepEqual(greeting?.args.named, { name: 'a' }, 'its arguments');

      run(() => (state.name = 'b'));
      await renderSettled();
      assert.deepEqual(this.rootChildren()[0]?.args.named, { name: 'b' }, 'its arguments now');
    }

    ['@test a modifier is a node of the component whose template renders its element'](
      assert: QUnit['assert']
    ) {
      let instances: object[] = [];
      class Mark {}
      setModifierManager(
        () => ({
          capabilities: modifierCapabilities('3.22'),
          createModifier() {
            let instance = {};
            instances.push(instance);
            return instance;
          },
          installModifier() {},
          updateModifier() {},
          destroyModifier() {},
        }),
        Mark
      );
      let Outer = setComponentTemplate(
        precompileTemplate('<div {{mark "a" b="c"}}></div>', {
          strictMode: true,
          scope: () => ({ mark: Mark }),
        }),
        templateOnly()
      );
      let Root = setComponentTemplate(
        precompileTemplate('<Outer />', { strictMode: true, scope: () => ({ Outer }) }),
        templateOnly()
      );

      let element = this.renderInto(Root);
      assert.deepEqual(shape(this.rootChildren()), ['Outer(modifier:mark)'], 'the tree');

      let modifier = this.rootChildren()[0]?.children[0];
      let div = element.querySelector('div')!;
      assert.deepEqual(
        modifier?.args,
        { positional: ['a'], named: { b: 'c' } },
        'the modifier arguments'
      );
      assert.strictEqual(modifier?.instance, instances[0], 'its instance');
      assert.strictEqual(boundsOf(modifier)?.firstNode, div, 'its element is its first node');
      assert.strictEqual(boundsOf(modifier)?.lastNode, div, 'and its last node');
    }
  }
);
