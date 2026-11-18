import { getInternalHelperManager } from '@glimmer/manager/lib/internal/api';
import { createCache, getValue, isConst } from '@glimmer/validator/lib/tracking';

import type { Block, Mounted, Thunk } from './core';
import { mount, removeRange, unmount } from './core';
import type { Named } from './managers';

import { instantiate, invoke, invokeDyn, isComponentDefinition } from './invoke';
import { helper, helperDyn } from './managers';
import { str } from './values';

/**
 * `{{x}}` where `x` is a bare lexical identifier. It may be a helper, which
 * is invoked with no arguments.
 */
export const MAY_CALL = 1;

/**
 * `{{{x}}}`
 */
export const TRUSTING = 2;

const enum Kind {
  text,
  html,
  node,
  component,
}

interface SafeString {
  toHTML(): string;
}

function isSafeString(value: unknown): value is SafeString {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<SafeString>).toHTML === 'function'
  );
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<Node>).nodeType === 'number'
  );
}

function kindOf(value: unknown, flags: number): Kind {
  if (typeof value === 'string') return flags & TRUSTING ? Kind.html : Kind.text;
  if (value === null || value === undefined) return Kind.text;
  if (typeof value !== 'object' && typeof value !== 'function') return Kind.text;
  if (isSafeString(value)) return Kind.html;
  if (isNode(value)) return Kind.node;
  if (isComponentDefinition(value)) return Kind.component;
  return Kind.text;
}

function isHelperLike(value: unknown): value is object {
  if (isComponentDefinition(value)) return false;
  if (typeof value === 'function') return true;
  return (
    typeof value === 'object' && value !== null && getInternalHelperManager(value, true) !== null
  );
}

interface Slot {
  first: Node;
  last: Node;
  text: Text | null;
  mounted: Mounted | null;
}

function insertNodes(parent: Node, before: Node, nodes: Node): Slot {
  let doc = parent.ownerDocument ?? (parent as Document);

  if (nodes.nodeType === 11 /* DocumentFragment */) {
    if (!nodes.firstChild) nodes.appendChild(doc.createTextNode(''));
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- non-empty
    let first = nodes.firstChild!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- non-empty
    let last = nodes.lastChild!;
    parent.insertBefore(nodes, before);
    return { first, last, text: null, mounted: null };
  }

  parent.insertBefore(nodes, before);
  return { first: nodes, last: nodes, text: null, mounted: null };
}

function render(b: Block, parent: Node, before: Node, kind: Kind, value: unknown, flags: number) {
  let doc = b.root.document;

  switch (kind) {
    case Kind.text: {
      let text = doc.createTextNode(str(value));
      parent.insertBefore(text, before);
      return { first: text, last: text, text, mounted: null };
    }
    case Kind.html: {
      let t = doc.createElement('template');
      t.innerHTML =
        flags & TRUSTING && !isSafeString(value) ? str(value) : (value as SafeString).toHTML();
      return insertNodes(parent, before, t.content);
    }
    case Kind.node:
      return insertNodes(parent, before, value as Node);
    case Kind.component: {
      let mounted = mount(b, before, (child) =>
        instantiate(child, value as object, {}, null, null)
      );
      return { first: mounted.start, last: mounted.end, text: null, mounted };
    }
  }
}

function clear(slot: Slot) {
  if (slot.mounted) {
    unmount(slot.mounted);
  } else {
    removeRange(slot.first, slot.last);
  }
}

/**
 * `{{value}}` in content position. The value's type decides what is rendered
 * (text, trusted HTML, a DOM node, or a component), and can change over time.
 */
export function content(b: Block, anchor: Node, fn: Thunk, flags = 0): void {
  if (flags & MAY_CALL) {
    let definition = fn();
    if (isHelperLike(definition)) fn = helper(b, definition, null, null);
  }

  let cache = createCache(fn);
  let value = getValue(cache);
  let kind = kindOf(value, flags);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- anchors are always attached
  let parent = anchor.parentNode!;
  let slot: Slot = render(b, parent, anchor, kind, value, flags);
  parent.removeChild(anchor);

  if (isConst(cache) && kind !== Kind.component) return;

  b.updaters.push(() => {
    let next = getValue(cache);

    if (next === value) {
      slot.mounted?.b.update();
      return;
    }

    let nextKind = kindOf(next, flags);

    if (kind === Kind.text && nextKind === Kind.text && slot.text) {
      slot.text.data = str(next);
      value = next;
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- slots are always attached
    let nextSlot = render(b, slot.first.parentNode!, slot.first, nextKind, next, flags);
    clear(slot);
    slot = nextSlot;
    kind = nextKind;
    value = next;
  });
}

/**
 * `{{foo a b=c}}`: invokes `foo` as a component or as a helper, depending
 * on what it is.
 */
export function appendCall(
  b: Block,
  anchor: Node,
  definition: unknown,
  isStatic: boolean,
  positional: Thunk[] | null,
  named: Named | null,
  flags = 0
): void {
  let value = isStatic ? definition : (definition as Thunk)();

  if (isComponentDefinition(value)) {
    if (positional) {
      throw new Error('positional arguments to components are not supported yet');
    }
    if (isStatic) {
      invoke(b, anchor, value, named ?? {}, null, null);
    } else {
      invokeDyn(b, anchor, definition as Thunk, named ?? {}, null, null);
    }
    return;
  }

  let result = isStatic
    ? helper(b, value as object, positional, named)
    : helperDyn(b, definition as Thunk, positional, named);

  content(b, anchor, result, flags);
}
