import type { Tag } from '@glimmer/interfaces';
import { destroy } from '@glimmer/destroyable';
import { track } from '@glimmer/validator/lib/tracking';
import { validateTag, valueForTag } from '@glimmer/validator/lib/validators';
import { _backburner } from '@ember/runloop';

import type { OutletSink, Template } from './core';
import type { Named } from './managers';

import './setup';
import { Block, marker, mount, removeRange, Root } from './core';
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

function renderRoot(
  { into, owner = {}, outlets }: RootOptions,
  render: (b: Block) => Node
): RenderResult {
  let root = new Root(owner, into.ownerDocument);
  root.outlets = outlets ?? null;
  let b = new Block(root, null);

  into.innerHTML = '';
  let end = marker(root);
  into.appendChild(end);

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
    let m = mount(b, end, render);
    b.updaters.push(() => {
      m.b.update();
    });
  });

  let rerender = () => {
    if (destroyed || validateTag(tag, revision)) return;
    pass(() => {
      b.update();
    });
  };

  // Same hook the VM renderer uses to revalidate.
  _backburner.on('end', rerender);

  return {
    rerender,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      _backburner.off('end', rerender);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- always has content
      removeRange(into.firstChild!, end);
      destroy(b);
    },
  };
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
