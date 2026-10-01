import type { CapturedArguments, Reference } from '@glimmer/interfaces';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { getInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { valueForRef } from '@glimmer/reference/lib/reference';
import { createCache, getValue } from '@glimmer/validator/lib/tracking';

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
export type VMFallback = (
  definition: object,
  into: Element,
  owner: object,
  args: Record<string, unknown>
) => { destroy(): void };

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

function island(b: Block, definition: object, named: Named): Node {
  if (!vmFallback) {
    throw new Error(
      `${describe(definition)} does not have a compiled template, and there is no VM fallback registered to render it.`
    );
  }

  let args = Object.create(null) as Record<string, unknown>;
  for (let key of Object.keys(named)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- iterating own keys
    Object.defineProperty(args, key, { enumerable: true, get: named[key]! });
  }

  // The VM needs an element it owns, so that our DOM moves and removals
  // never invalidate its bounds.
  let element = b.root.document.createElement('glimmer-island');
  element.style.display = 'contents';

  let result = vmFallback(definition, element, b.root.owner, args);
  registerDestructor(b, () => {
    result.destroy();
  });

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
  attrs: AttrsFn | null
): Node {
  while (definition instanceof Curried) {
    named = { ...definition.named, ...named };
    definition = definition.definition;
  }

  let compiled = templateFor(definition);

  if (!compiled) return island(b, definition, named);

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

  let render = (value: unknown) =>
    value ? mount(b, anchor, (child) => instantiate(child, value, named, blocks, attrs)) : null;

  let m = render(current);

  b.updaters.push(() => {
    let next = getValue(cache);
    if (next === current) {
      m?.b.update();
      return;
    }

    if (m) unmount(m);
    current = next;
    m = render(next);
  });
}
