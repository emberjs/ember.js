import type { Tag } from '@glimmer/interfaces';
import {
  associateDestroyableChild,
  destroy,
  isDestroying,
  registerDestructor,
} from '@glimmer/destroyable';
import { track } from '@glimmer/validator/lib/tracking';
import { validateTag, valueForTag } from '@glimmer/validator/lib/validators';
import { _backburner } from '@ember/runloop';

import type { BlockFn, OutletSink, Template, Thunk } from './core';
import type { Named } from './managers';

import './setup';
import { Block, mount, removeRange, Root } from './core';
import { instantiate } from './invoke';

export interface RenderResult {
  /**
   * Re-render now, if anything this render depends on has changed.
   * (This also happens automatically at the end of every runloop.)
   */
  rerender(): void;
  destroy(): void;
}

interface RootOptions {
  into: Element;
  owner?: object;
  outlets?: OutletSink | undefined;
}

/**
 * Runs `build` in a new render tree, and keeps it up to date (at the end of
 * every runloop) until the result is destroyed.
 */
function startRoot(
  owner: object,
  document: Document,
  outlets: OutletSink | undefined,
  build: (b: Block) => void,
  cleanup: () => void
): RenderResult {
  let root = new Root(owner, document);
  root.outlets = outlets ?? null;
  let b = new Block(root, null);

  let tag: Tag;
  let revision: number;
  let destroyed = false;

  // Everything read while rendering (including by modifiers, which run in
  // `flush`) decides whether the next runloop needs to re-render.
  let pass = (fn: () => void) => {
    tag = track(() => {
      fn();
      root.flush();
    });
    revision = valueForTag(tag);
  };

  pass(() => {
    build(b);
  });

  let result: RenderResult;

  let rerender = () => {
    // (destruction is scheduled, so this may still be called while destroying)
    if (destroyed || isDestroying(result) || validateTag(tag, revision)) return;
    pass(() => {
      b.update();
    });
  };

  // Same hook the VM renderer uses to revalidate.
  _backburner.on('end', rerender);

  result = {
    rerender,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      _backburner.off('end', rerender);
      cleanup();
      if (!isDestroying(result)) destroy(result);
    },
  };

  // The result is a destroyable too: associating it with an owner (like a
  // component instance) tears the tree down in the same pass as the owner.
  associateDestroyableChild(result, b);
  registerDestructor(result, () => {
    result.destroy();
  });

  return result;
}

function renderRoot(
  { into, owner = {}, outlets }: RootOptions,
  render: (b: Block) => Node
): RenderResult {
  into.innerHTML = '';
  let end = into.ownerDocument.createTextNode('');
  into.appendChild(end);

  return startRoot(
    owner,
    into.ownerDocument,
    outlets,
    (b) => {
      let m = mount(b, end, render);
      b.updaters.push(() => {
        m.b.update();
      });
    },
    () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- always has content
      removeRange(into.firstChild!, end);
    }
  );
}

/**
 * Apply compiled template code to an existing element, and keep it up to
 * date (e.g. attributes and modifiers passed to a component that the VM
 * renders).
 */
export function attach(element: Element, owner: object, build: (b: Block) => void): RenderResult {
  return startRoot(owner, element.ownerDocument, undefined, build, () => {});
}

/**
 * Render a compiled block (with block params from the VM) into an element.
 */
export function renderBlock(
  block: BlockFn,
  params: Thunk[],
  { into, owner }: { into: Element; owner: object }
): RenderResult {
  return renderRoot({ into, owner }, (child) => block(child, ...params));
}

/**
 * Render a component (compiled with the codegen compiler) into an element.
 *
 * Mirrors `renderComponent` from `@ember/renderer`.
 */
export function renderComponent(
  component: object,
  {
    into,
    owner,
    args,
  }: {
    into: Element;
    owner?: object;
    args?: Record<string, unknown>;
  }
): RenderResult {
  let named: Named = {};
  if (args) {
    for (let key of Object.keys(args)) named[key] = () => args[key];
  }

  return renderRoot(owner ? { into, owner } : { into }, (child) =>
    instantiate(child, component, named, null, null)
  );
}

/**
 * Render a compiled template for an already-created component instance
 * (used when the VM renders a compiled component, see `@glimmer/dom/vm`).
 */
export function renderTemplate(
  template: Template,
  options: RootOptions & { self: unknown; args: Record<string, unknown> }
): RenderResult {
  return renderRoot(options, (child) =>
    template.render(child, { self: options.self, args: options.args, blocks: null, attrs: null })
  );
}
