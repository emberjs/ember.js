/**
 * `renderComponent` roots (compat, GXT_MODE).
 *
 * Glimmer semantics:
 *
 * - a `renderComponent` render is a root of its owner's renderer: the renderer
 *   is in Ember's renderer list while it has roots, and `captureRenderTree`
 *   (Ember Inspector) lists one `{ROOT}` node per render, with the render's
 *   arguments and bounds, until the render is destroyed;
 * - the bounds of a root follow its render as it updates;
 * - a render into a cursor (`{ element, nextSibling }`) is inserted before the
 *   cursor's `nextSibling`, and leaves the element's other nodes in place;
 * - an error thrown while a root updates reaches the code that asked for the
 *   update (`renderer.rerender()` in a run loop).
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
import { setRenderer } from '@ember/-internals/glimmer';
import { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import GlimmerComponent from '@glimmer/component';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { setComponentTemplate } from '@glimmer/manager';

interface DomBounds {
  parentElement: Node;
  firstNode: Node;
  lastNode: Node;
}

class RenderComponentRootTestCase extends AbstractStrictTestCase {
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);
    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element(): Element {
    return document.querySelector('#qunit-fixture')!;
  }

  // A new element in the fixture.
  container(html = ''): HTMLElement {
    let element = document.createElement('div');
    element.innerHTML = html;
    this.element.append(element);
    return element;
  }

  rootBounds(): DomBounds | null | undefined {
    return captureRenderTree(this.owner)[0]?.bounds as unknown as DomBounds | null | undefined;
  }
}

moduleFor(
  'GXT renderComponent roots',
  class extends RenderComponentRootTestCase {
    async ['@test each render is a {ROOT} node of captureRenderTree until it is destroyed'](
      assert: QUnit['assert']
    ) {
      let Root = setComponentTemplate(precompileTemplate('<p>{{@name}}</p>'), templateOnly());
      let first = this.container();
      let second = this.container();

      let owned = renderComponent(Root, {
        owner: this.owner,
        into: first,
        args: { name: 'owned' },
      });
      let ownerless = renderComponent(Root, { into: second, args: { name: 'ownerless' } });

      let nodes = captureRenderTree(this.owner);
      assert.deepEqual(
        nodes.map((node) => node.name),
        ['{ROOT}', '{ROOT}'],
        'one root node per render, whatever its owner'
      );
      assert.deepEqual(
        nodes.map((node) => node.args),
        [
          { positional: [], named: { name: 'owned' } },
          { positional: [], named: { name: 'ownerless' } },
        ],
        'a root node has the arguments of its render'
      );
      let bounds = nodes[0]?.bounds as unknown as DomBounds | null | undefined;
      assert.strictEqual(bounds?.parentElement, first, 'the parent of a root is its element');
      assert.strictEqual(bounds?.firstNode, first.firstChild, 'the first node of a root');
      assert.strictEqual(bounds?.lastNode, first.lastChild, 'the last node of a root');

      owned.destroy();
      ownerless.destroy();
      await renderSettled();

      assert.deepEqual(captureRenderTree(this.owner), [], 'destroyed renders are gone');
    }

    async ['@test the bounds of a root follow its render as it updates'](assert: QUnit['assert']) {
      let state = trackedObject({ shown: true });
      let Root = setComponentTemplate(
        precompileTemplate('{{#if state.shown}}<p>shown</p>{{/if}}<span>last</span>', {
          strictMode: true,
          scope: () => ({ state }),
        }),
        templateOnly()
      );
      let element = this.container();
      let result = renderComponent(Root, { owner: this.owner, into: element });
      registerDestructor(this, () => result.destroy());

      assert.strictEqual(this.rootBounds()?.firstNode, element.firstChild, 'initial first node');
      assert.strictEqual(this.rootBounds()?.lastNode, element.lastChild, 'initial last node');

      run(() => (state.shown = false));
      await renderSettled();
      assert.strictEqual(
        this.rootBounds()?.firstNode,
        element.firstChild,
        'the first node after the first node was removed'
      );
      assert.strictEqual(this.rootBounds()?.lastNode, element.lastChild, 'the last node');

      run(() => (state.shown = true));
      await renderSettled();
      assert.strictEqual(
        this.rootBounds()?.firstNode,
        element.firstChild,
        'the first node after a first node was added'
      );
      assert.strictEqual(this.rootBounds()?.lastNode, element.lastChild, 'the last node');
    }
  }
);

moduleFor(
  'GXT renderComponent into a cursor',
  class extends RenderComponentRootTestCase {
    async ["@test a render goes before the cursor's nextSibling"](assert: QUnit['assert']) {
      let Root = setComponentTemplate(precompileTemplate('<p>{{@name}}</p>'), templateOnly());
      let element = this.container('<b>before</b><!--marker--><i>after</i>');
      let marker = element.childNodes[1]!;

      let result = renderComponent(Root, {
        owner: this.owner,
        into: { element, nextSibling: marker } as unknown as Element,
        args: { name: 'hello' },
      });
      assert.strictEqual(
        element.innerHTML,
        '<b>before</b><p>hello</p><!--marker--><i>after</i>',
        'the render is before the marker, and the nodes around it stay'
      );

      result.destroy();
      await renderSettled();
      assert.strictEqual(
        element.innerHTML,
        '<b>before</b><!--marker--><i>after</i>',
        'destroying the render removes only its nodes'
      );
    }
  }
);

moduleFor(
  'GXT renderComponent root errors',
  class extends RenderComponentRootTestCase {
    ['@test an error thrown while a root updates reaches the caller of rerender()'](
      assert: QUnit['assert']
    ) {
      class Foo extends GlimmerComponent {
        constructor(owner: Owner, args: object) {
          super(owner, args);
          throw new Error('Foo could not be created');
        }
      }
      setComponentTemplate(precompileTemplate('Hello'), Foo);
      let state = trackedObject({ showing: false });
      let Root = setComponentTemplate(
        precompileTemplate('{{#if state.showing}}<Foo/>{{/if}}', {
          strictMode: true,
          scope: () => ({ Foo, state }),
        }),
        templateOnly()
      );
      let renderer = BaseRenderer.strict(this.owner, document, { isInteractive: true });
      setRenderer(this.owner, renderer);
      let result = renderComponent(Root, { owner: this.owner, into: this.container() });
      registerDestructor(this, () => result.destroy());

      assert.throws(() => {
        run(() => {
          state.showing = true;
          renderer.rerender();
        });
      }, /Foo could not be created/);
    }
  }
);
