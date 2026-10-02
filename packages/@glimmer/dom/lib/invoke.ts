import type { CapturedArguments, Reference } from '@glimmer/interfaces';
import { associateDestroyableChild } from '@glimmer/destroyable';
import { getInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { getComponentTemplate } from '@glimmer/manager/lib/public/template';
import { valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag, createCache, getValue } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';

import type { AttrsFn, Block, Blocks, Thunk } from './core';
import type { Named } from './managers';

import { mount, Template, templateFor, unmount } from './core';
import { capture } from './managers';

/**
 * The result of `(component Foo bar=1)`.
 */
export class Curried {
  constructor(
    readonly definition: object,
    readonly named: Named
  ) {}
}

export function curry(definition: unknown, named: Named | null): Curried | null {
  if (!definition) return null;
  return new Curried(definition, named ?? {});
}

export function isComponentDefinition(value: unknown): value is object {
  if (value instanceof Template || value instanceof Curried) return true;
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return false;
  if (templateFor(value)) return true;
  return getInternalComponentManager(value, true) !== null;
}

/**
 * Renders components that were not compiled with this compiler (e.g. from
 * addons) via the VM. Registered by the Ember integration (see `render.ts`).
 */
export interface VMFallback {
  /**
   * Render `definition()` with the VM into `into`, and return a destroyable
   * for the render. `definition` is tracked, so values that the VM can
   * update in place (see `canUpdate`) don't require a new render.
   */
  render(
    definition: Thunk<object>,
    into: Element,
    owner: object,
    invocation: { named: Named; blocks: Blocks | null; attrs: AttrsFn | null }
  ): object;

  /**
   * Can the VM render switch from `from` to `to` by itself (like it does for
   * `<@outlet />` getting a new curried value)?
   */
  canUpdate(from: unknown, to: unknown): boolean;
}

let vmFallback: VMFallback | null = null;

export function setVMFallback(fallback: VMFallback): void {
  vmFallback = fallback;
}

function describe(definition: object): string {
  return typeof definition === 'function'
    ? definition.name || '(anonymous component)'
    : Object.prototype.toString.call(definition);
}

function argsFor(captured: CapturedArguments): Record<string, unknown> {
  let args = Object.create(null) as Record<string, unknown>;
  for (let key of Object.keys(captured.named)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- iterating own keys
    let ref = captured.named[key]!;
    Object.defineProperty(args, key, { enumerable: true, get: () => valueForRef(ref) });
  }
  return args;
}

function island(
  b: Block,
  definition: object,
  named: Named,
  blocks: Blocks | null,
  attrs: AttrsFn | null,
  current?: Thunk<object>
): Node {
  if (!vmFallback) {
    throw new Error(
      `${describe(definition)} does not have a compiled template. To render it with the VM, import '@glimmer/dom/vm' (or compile with \`vmInterop\`).`
    );
  }

  // The VM needs an element it owns, so that our DOM moves and removals
  // never invalidate its bounds.
  let element = b.root.document.createElement('glimmer-island');
  element.style.display = 'contents';

  // A destroyable child, so the VM's render is torn down in the same pass
  // as this block (not a scheduling round later).
  associateDestroyableChild(
    b,
    vmFallback.render(current ?? (() => definition), element, b.root.owner, {
      named,
      blocks,
      attrs,
    })
  );

  return element;
}

interface CustomComponentManagerLike {
  create(owner: object, definition: object, args: { capture(): CapturedArguments }): object;
  getSelf(state: object): Reference;
  getDestroyable(state: object): object | null;
  didCreate(state: object): void;
}

/**
 * Create a component and render its template into `b`.
 */
export function instantiate(
  b: Block,
  definition: object,
  named: Named,
  blocks: Blocks | null,
  attrs: AttrsFn | null,
  current?: Thunk<object>
): Node {
  while (definition instanceof Curried) {
    named = { ...definition.named, ...named };
    definition = definition.definition;
  }

  let compiled = templateFor(definition);

  // A component without any template (e.g. a Glimmer component used only
  // for its lifecycle) doesn't need the VM: it renders nothing.
  let templateless =
    !compiled &&
    !getComponentTemplate(definition) &&
    'getDelegateFor' in (getInternalComponentManager(definition, true) ?? {});

  if (!compiled && !templateless) return island(b, definition, named, blocks, attrs, current);

  let captured = capture(named, null);
  let args = argsFor(captured);

  // template-only
  if (compiled === definition) {
    return compiled.render(b, { self: undefined, args, blocks, attrs });
  }

  let manager = getInternalComponentManager(definition) as unknown as CustomComponentManagerLike;

  if (!('getDelegateFor' in manager)) {
    throw new Error(
      `Compiled templates can only be used with components that have a custom component manager (like @glimmer/component). ${describe(definition)} does not.`
    );
  }

  let state = manager.create(b.root.owner, definition, { capture: () => captured });
  let self = valueForRef(manager.getSelf(state));

  let destroyable = manager.getDestroyable(state);
  if (destroyable) associateDestroyableChild(b, destroyable);

  b.root.schedule(() => {
    manager.didCreate(state);
  });

  if (!compiled) return b.root.document.createDocumentFragment();

  return compiled.render(b, { self, args, blocks, attrs });
}

/**
 * `<Foo />` where `Foo` is statically known (an import, or a local).
 */
export function invoke(
  b: Block,
  anchor: Node,
  definition: object,
  named: Named,
  blocks: Blocks | null,
  attrs: AttrsFn | null
): void {
  let m = mount(b, anchor, (child) => instantiate(child, definition, named, blocks, attrs));
  b.updaters.push(() => {
    m.b.update();
  });
}

/**
 * `<this.Foo />`, `<@foo />`, `{{component this.foo}}`, `<item.Foo />` ...
 */
export function invokeDyn(
  b: Block,
  anchor: Node,
  definition: Thunk,
  named: Named,
  blocks: Blocks | null,
  attrs: AttrsFn | null
): void {
  let cache = createCache(definition);
  let current = getValue(cache);

  // What the VM reads, when it renders the definition (see VMFallback)
  let tag = createTag();
  let read = () => {
    consumeTag(tag);
    return current as object;
  };

  let render = (value: unknown) =>
    value
      ? mount(b, anchor, (child) => instantiate(child, value, named, blocks, attrs, read))
      : null;

  let m = render(current);

  b.updaters.push(() => {
    let next = getValue(cache);
    if (next === current) {
      m?.b.update();
      return;
    }

    if (m && vmFallback?.canUpdate(current, next)) {
      current = next;
      dirtyTag(tag);
      m.b.update();
      return;
    }

    if (m) unmount(m);
    current = next;
    m = render(next);
  });
}
