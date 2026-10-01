import type { Tag } from '@glimmer/interfaces';
import { destroy } from '@glimmer/destroyable';
import { track } from '@glimmer/validator/lib/tracking';
import { validateTag, valueForTag } from '@glimmer/validator/lib/validators';
import { renderComponent as renderWithVM } from '@ember/-internals/glimmer/lib/base-renderer';
import { _backburner } from '@ember/runloop';

import type { Named } from './managers';

import { Block, marker, mount, removeRange, Root } from './core';
import { instantiate, setVMFallback } from './invoke';

// Components that were not compiled with the codegen compiler (e.g. from
// addons) are rendered with the VM, into an element we own.
setVMFallback((definition, into, owner, args) => renderWithVM(definition, { into, owner, args }));

export interface RenderResult {
  /**
   * Re-render now, if anything this render depends on has changed.
   * (This also happens automatically at the end of every runloop.)
   */
  rerender(): void;
  destroy(): void;
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
    owner = {},
    args,
  }: {
    into: Element;
    owner?: object;
    args?: Record<string, unknown>;
  }
): RenderResult {
  let root = new Root(owner, into.ownerDocument);
  let b = new Block(root, null);

  let named: Named = {};
  if (args) {
    for (let key of Object.keys(args)) named[key] = () => args[key];
  }

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
    let m = mount(b, end, (child) => instantiate(child, component, named, null, null));
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
