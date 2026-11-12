import type { OpaqueIterator } from '@glimmer/reference/lib/iterable';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { createIteratorRef } from '@glimmer/reference/lib/iterable';
import { consumeTag, createCache, getValue } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';
import { tagFor } from '@glimmer/validator/lib/meta';

import type { Block, BlockFn, Ctx, Mounted, Thunk } from './core';

import { marker, mount, moveRange, removeRange, unmount } from './core';

/**
 * `{{#if}}` / `{{#unless}}` (the compiler negates the condition for unless).
 */
export function when(
  b: Block,
  anchor: Node,
  condition: Thunk<boolean>,
  consequent: BlockFn,
  alternate?: BlockFn
): void {
  let cache = createCache(condition);
  let current = Boolean(getValue(cache));

  let render = (value: boolean): Mounted | null => {
    let fn = value ? consequent : alternate;
    return fn ? mount(b, anchor, fn) : null;
  };

  let m = render(current);

  b.updaters.push(() => {
    let next = Boolean(getValue(cache));
    if (next === current) {
      m?.b.update();
      return;
    }

    if (m) unmount(m);
    current = next;
    m = render(next);
  });
}

interface Cell {
  read: Thunk;
  set(value: unknown): void;
}

function cell(initial: unknown): Cell {
  let tag = createTag();
  let value = initial;
  return {
    read: () => {
      consumeTag(tag);
      return value;
    },
    set(next) {
      if (next !== value) {
        value = next;
        dirtyTag(tag);
      }
    },
  };
}

interface Row {
  value: Cell;
  index: Cell;
  m: Mounted | null;
}

/**
 * `{{#each}}`, keyed by `key` (`@identity` by default).
 */
export function each(
  b: Block,
  anchor: Node,
  list: Thunk,
  key: string | null,
  item: BlockFn,
  inverse?: BlockFn
): void {
  let listRef = createComputeRef(() => {
    let value = list();
    // equivalent to `-track-array`
    if (typeof value === 'object' && value !== null) consumeTag(tagFor(value, '[]'));
    return value;
  });
  let iteratorRef = createIteratorRef(listRef, key ?? '@identity');

  let rows: Row[] = [];
  let byKey = new Map<unknown, Row>();
  let inverseMounted: Mounted | null = null;
  let lastIterator: OpaqueIterator | null = null;

  let sync = () => {
    let iterator = valueForRef(iteratorRef) as OpaqueIterator;

    if (iterator === lastIterator) {
      for (let row of rows) row.m?.b.update();
      inverseMounted?.b.update();
      return;
    }

    lastIterator = iterator;

    let nextRows: Row[] = [];
    let nextByKey = new Map<unknown, Row>();

    for (let entry = iterator.next(); entry !== null; entry = iterator.next()) {
      let row = byKey.get(entry.key);

      if (row) {
        row.value.set(entry.value);
        row.index.set(entry.memo);
      } else {
        row = { value: cell(entry.value), index: cell(entry.memo), m: null };
      }

      nextByKey.set(entry.key, row);
      nextRows.push(row);
    }

    for (let [k, row] of byKey) {
      if (nextByKey.get(k) !== row && row.m) unmount(row.m);
    }

    // Place rows back-to-front, so each row knows what it must precede.
    let before: Node = anchor;
    for (let i = nextRows.length - 1; i >= 0; i--) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- in bounds
      let row = nextRows[i]!;

      if (row.m === null) {
        let { value, index } = row;
        row.m = mount(b, before, (child) => item(child, value.read, index.read));
      } else {
        if (row.m.end.nextSibling !== before) moveRange(row.m, before);
        row.m.b.update();
      }

      before = row.m.start;
    }

    rows = nextRows;
    byKey = nextByKey;

    if (rows.length === 0 && inverse && !inverseMounted) {
      inverseMounted = mount(b, anchor, inverse);
    } else if (rows.length > 0 && inverseMounted) {
      unmount(inverseMounted);
      inverseMounted = null;
    }
  };

  sync();
  b.updaters.push(sync);
}

function block(b: Block, anchor: Node, fn: BlockFn, params: Thunk[]): void {
  let m = mount(b, anchor, (child) => fn(child, ...params));
  b.updaters.push(() => {
    m.b.update();
  });
}

/**
 * `{{yield}}` / `{{yield to="name"}}`
 */
export function yieldTo(b: Block, anchor: Node, ctx: Ctx, name: string, params: Thunk[]): void {
  let fn = ctx.blocks?.[name] ?? (name === 'else' ? ctx.blocks?.['inverse'] : undefined);
  if (fn) block(b, anchor, fn, params);
}

/**
 * `{{#let}}` (bindings are created by the compiler via `memo`)
 */
export function scope(b: Block, anchor: Node, fn: BlockFn): void {
  block(b, anchor, fn, []);
}

/**
 * `{{#in-element}}`. By default the destination's content is replaced;
 * pass `insertBefore=null` to append.
 */
export function inElement(b: Block, destination: Thunk, append: boolean, fn: BlockFn): void {
  let cache = createCache(destination);
  let current: Element | null = null;
  let m: Mounted | null = null;
  let end: Node | null = null;

  let render = (target: Element | null) => {
    current = target;
    if (!target) return;
    if (!append) target.innerHTML = '';
    end = marker(b.root);
    target.appendChild(end);
    m = mount(b, end, fn);
  };

  render(getValue(cache) as Element | null);

  b.updaters.push(() => {
    let next = getValue(cache) as Element | null;
    if (next === current) {
      m?.b.update();
      return;
    }

    if (m) unmount(m);
    if (end) removeRange(end, end);
    m = null;
    end = null;
    render(next);
  });
}
