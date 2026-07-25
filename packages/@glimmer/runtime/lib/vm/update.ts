import { DEBUG } from '@glimmer/env';
import type {
  AppendingBlock,
  Bounds,
  DynamicScope,
  Environment,
  EvaluationContext,
  ExceptionHandler,
  GlimmerTreeChanges,
  Nullable,
  ResettableBlock,
  Scope,
  SimpleComment,
  UpdatingOpcode,
  UpdatingVM as IUpdatingVM,
} from '@glimmer/interfaces';
import type { OpaqueIterationItem, OpaqueIterator } from '@glimmer/reference/lib/iterable';
import type { Reference } from '@glimmer/reference/lib/reference';
import type { Revision, Tag } from '@glimmer/interfaces';
import { expect, unwrap } from '@glimmer/debug-util/lib/platform-utils';
import { associateDestroyableChild, destroy, destroyChildren } from '@glimmer/destroyable';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { updateRef, valueForRef } from '@glimmer/reference/lib/reference';
import { logStep } from '@glimmer/util/lib/debug-steps';
import { debug } from '@glimmer/validator/lib/debug';
import { beginTrackFrame, consumeTag, endTrackFrame, resetTracking } from '@glimmer/validator/lib/tracking';
import { INITIAL, validateTag, valueForTag } from '@glimmer/validator/lib/validators';

import type { Closure } from './append';
import type { AppendingBlockList } from './element-builder';

import { clear, move as moveBounds } from '../bounds';
import { NewTreeBuilder } from './element-builder';

export class UpdatingVM implements IUpdatingVM {
  public env: Environment;
  public dom: GlimmerTreeChanges;
  public alwaysRevalidate: boolean;

  /**
   * SPIKE: a flat frame stack (parallel arrays indexed by depth)
   * instead of allocating an UpdatingVMFrame per block per render.
   */
  #ops: UpdatingOpcode[][] = [];
  #current: number[] = [];
  #handlers: Nullable<ExceptionHandler>[] = [];
  #finalizers: (((didError: boolean) => void) | undefined)[] = [];
  #depth = -1;

  constructor(env: Environment, { alwaysRevalidate = false }) {
    this.env = env;
    this.dom = env.getDOM();
    this.alwaysRevalidate = alwaysRevalidate;
  }

  execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler) {
    if (DEBUG) {
      let hasErrored = true;
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        debug.runInTrackingTransaction!(
          () => this._execute(opcodes, handler),
          '- While rendering:'
        );

        // using a boolean here to avoid breaking ergonomics of "pause on uncaught exceptions"
        // which would happen with a `catch` + `throw`
        hasErrored = false;
      } finally {
        if (hasErrored) {
          // eslint-disable-next-line no-console
          console.error(`\n\nError occurred:\n\n${resetTracking()}\n\n`);
        }
      }
    } else {
      this._execute(opcodes, handler);
    }
  }

  private _execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler) {
    this.try(opcodes, handler);

    while (this.#depth >= 0) {
      let depth = this.#depth;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- depth checked
      let ops = this.#ops[depth]!;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- depth checked
      let index = this.#current[depth]!;

      if (index >= ops.length) {
        this.#pop(false);
        continue;
      }

      this.#current[depth] = index + 1;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
      ops[index]!.evaluate(this);
    }
  }

  #pop(didError: boolean) {
    let depth = this.#depth;
    let finalizer = this.#finalizers[depth];

    // release references so retained arrays don't leak between renders
    this.#ops[depth] = EMPTY_OPS;
    this.#handlers[depth] = null;
    this.#finalizers[depth] = undefined;
    this.#depth = depth - 1;

    finalizer?.(didError);
  }

  goto(index: number) {
    this.#current[this.#depth] = index;
  }

  try(ops: UpdatingOpcode[], handler: Nullable<ExceptionHandler>, finalizer?: (didError: boolean) => void) {
    let depth = ++this.#depth;

    this.#ops[depth] = ops;
    this.#current[depth] = 0;
    this.#handlers[depth] = handler;
    this.#finalizers[depth] = finalizer;
  }

  throw() {
    this.#handlers[this.#depth]?.handleException();
    this.#pop(true);
  }
}

const EMPTY_OPS: UpdatingOpcode[] = [];

export interface VMState {
  readonly pc: number;
  readonly scope: Scope;
  readonly dynamicScope: DynamicScope;
  readonly stack: unknown[];
}

export abstract class BlockOpcode implements UpdatingOpcode, Bounds {
  public children: UpdatingOpcode[];

  protected readonly bounds: AppendingBlock;

  constructor(
    protected state: Closure,
    protected context: EvaluationContext,
    bounds: AppendingBlock,
    children: UpdatingOpcode[]
  ) {
    this.children = children;
    this.bounds = bounds;
  }

  parentElement() {
    return this.bounds.parentElement();
  }

  firstNode() {
    return this.bounds.firstNode();
  }

  lastNode() {
    return this.bounds.lastNode();
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.children, null);
  }
}

export class TryOpcode extends BlockOpcode implements ExceptionHandler {
  public type = 'try';

  declare protected bounds: ResettableBlock; // Shadows property on base class

  override evaluate(vm: UpdatingVM) {
    vm.try(this.children, this);
  }

  handleException() {
    let {
      state,
      bounds,
      context: { env },
    } = this;

    destroyChildren(this);

    let tree = NewTreeBuilder.resume(env, bounds);
    let vm = state.evaluate(tree);

    let children = (this.children = []);

    let result = vm.execute((vm) => {
      vm.updateWith(this);
      vm.pushUpdating(children);
    });

    associateDestroyableChild(this, result.drop);
  }
}

export class ListItemOpcode extends TryOpcode {
  public retained = false;
  public index = -1;

  /**
   * Everything this item's subtree consumed during its last update,
   * combined. When still valid, the whole subtree is skipped -- one tag
   * validation instead of walking every opcode in the item.
   */
  private subtreeTag: Nullable<Tag> = null;
  private subtreeRevision: Revision = INITIAL;
  private isTrivial: boolean | null = null;

  constructor(
    state: Closure,
    context: EvaluationContext,
    bounds: ResettableBlock,
    public key: unknown,
    public memo: Reference,
    public value: Reference
  ) {
    super(state, context, bounds, []);
  }

  override evaluate(vm: UpdatingVM) {
    // Trivial items (a text node or two) can't win: validating their
    // combined tag costs as much as just updating them, so collection
    // would be pure overhead. Skipping only pays off for items with a
    // real subtree -- more than a couple of opcodes, or any nested
    // block (a nested block child means an arbitrarily large subtree
    // hides behind a small top-level count).
    if (this.isTrivial ?? (this.isTrivial = computeIsTrivial(this.children))) {
      vm.try(this.children, this);
      return;
    }

    let { subtreeTag } = this;

    if (
      subtreeTag !== null &&
      !vm.alwaysRevalidate &&
      validateTag(subtreeTag, this.subtreeRevision)
    ) {
      // propagate this item's dependencies to any enclosing tracking
      // frame, exactly as executing the children would have
      consumeTag(subtreeTag);
      return;
    }

    beginTrackFrame();
    vm.try(this.children, this, (didError) => {
      // always balance beginTrackFrame, even when unwinding
      let tag = endTrackFrame();

      if (didError) return;

      this.subtreeTag = tag;
      this.subtreeRevision = valueForTag(tag);
      consumeTag(tag);
    });
  }

  override handleException() {
    // children are about to be rebuilt; the collected tag and triviality
    // no longer describe them
    this.subtreeTag = null;
    this.isTrivial = null;
    super.handleException();
  }

  shouldRemove(): boolean {
    return !this.retained;
  }

  reset() {
    this.retained = false;
  }
}

function computeIsTrivial(children: UpdatingOpcode[]): boolean {
  if (children.length > 2) return false;

  for (const child of children) {
    if (child instanceof BlockOpcode) return false;
  }

  return true;
}

export class ListBlockOpcode extends BlockOpcode {
  public type = 'list-block';
  declare public children: ListItemOpcode[];

  private opcodeMap = new Map<unknown, ListItemOpcode>();
  private marker: SimpleComment | null = null;
  private lastIterator: OpaqueIterator;

  declare protected readonly bounds: AppendingBlockList;

  constructor(
    state: Closure,
    context: EvaluationContext,
    bounds: AppendingBlockList,
    children: ListItemOpcode[],
    private iterableRef: Reference<OpaqueIterator>
  ) {
    super(state, context, bounds, children);
    this.lastIterator = valueForRef(iterableRef);
  }

  initializeChild(opcode: ListItemOpcode) {
    opcode.index = this.children.length - 1;
    this.opcodeMap.set(opcode.key, opcode);
  }

  override evaluate(vm: UpdatingVM) {
    let iterator = valueForRef(this.iterableRef);

    if (this.lastIterator !== iterator) {
      // SPIKE: deriving a fresh array from tracked state is the idiomatic
      // pattern, so iterator identity changes every render even when the
      // list's keys did not. When items match the existing children in
      // order and count, just update the item refs -- no diff
      // bookkeeping, no marker DOM, no children rebuild.
      let buffered = this.tryFastSync(iterator);

      if (buffered !== null) {
        let { bounds } = this;
        let { dom } = vm;

        let marker = (this.marker = dom.createComment(''));
        dom.insertAfter(
          bounds.parentElement(),
          marker,
          expect(bounds.lastNode(), "can't insert after an empty bounds")
        );

        this.sync(new PrefixedIterator(buffered, iterator));

        this.parentElement().removeChild(marker);
        this.marker = null;
      }

      this.lastIterator = iterator;
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  /**
   * Streaming compare of the new iteration against existing children,
   * applied as it matches: allocation-free on the happy path (a shared
   * scratch item via nextInto). Returns null when everything matched in
   * order; otherwise reconstructs the already-applied prefix (reading
   * the just-updated refs back) plus the mismatched item, so the full
   * sync can replay them.
   */
  private tryFastSync(iterator: OpaqueIterator): Nullable<OpaqueIterationItem[]> {
    let { children } = this;
    let matched = 0;

    while (true) {
      let item =
        iterator.nextInto !== undefined ? iterator.nextInto(SCRATCH_ITEM) : iterator.next();

      if (item === null) {
        if (matched === children.length) return null;

        // the list shrank; replay the matched prefix through full sync
        return this.reconstructPrefix(matched, null);
      }

      let opcode = children[matched];

      if (opcode === undefined || opcode.key !== item.key) {
        return this.reconstructPrefix(matched, {
          key: item.key,
          value: item.value,
          memo: item.memo,
        });
      }

      updateRef(opcode.memo, item.memo);
      updateRef(opcode.value, item.value);
      matched++;
    }
  }

  /**
   * The matched prefix was already applied to the item refs, so its
   * items can be reconstructed from the opcodes themselves.
   */
  private reconstructPrefix(
    matched: number,
    mismatch: Nullable<OpaqueIterationItem>
  ): OpaqueIterationItem[] {
    let { children } = this;
    let prefix: OpaqueIterationItem[] = [];

    for (let i = 0; i < matched; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
      let opcode = children[i]!;

      prefix.push({
        key: opcode.key,
        value: valueForRef(opcode.value),
        memo: valueForRef(opcode.memo),
      });
    }

    if (mismatch !== null) prefix.push(mismatch);

    return prefix;
  }

  private sync(iterator: OpaqueIterator) {
    let { opcodeMap: itemMap, children } = this;

    let currentOpcodeIndex = 0;
    let seenIndex = 0;

    this.children = this.bounds.boundList = [];

    while (true) {
      let item = iterator.next();

      if (item === null) break;

      let opcode = children[currentOpcodeIndex];
      let { key } = item;

      // Items that have already been found and moved will already be retained,
      // we can continue until we find the next unretained item
      while (opcode !== undefined && opcode.retained) {
        opcode = children[++currentOpcodeIndex];
      }

      if (opcode !== undefined && opcode.key === key) {
        this.retainItem(opcode, item);
        currentOpcodeIndex++;
      } else if (itemMap.has(key)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        let itemOpcode = itemMap.get(key)!;

        // The item opcode was seen already, so we should move it.
        if (itemOpcode.index < seenIndex) {
          this.moveItem(itemOpcode, item, opcode);
        } else {
          // Update the seen index, we are going to be moving this item around
          // so any other items that come before it will likely need to move as
          // well.
          seenIndex = itemOpcode.index;

          let seenUnretained = false;

          // iterate through all of the opcodes between the current position and
          // the position of the item's opcode, and determine if they are all
          // retained.
          for (let i = currentOpcodeIndex + 1; i < seenIndex; i++) {
            if (!unwrap(children[i]).retained) {
              seenUnretained = true;
              break;
            }
          }

          // If we have seen only retained opcodes between this and the matching
          // opcode, it means that all the opcodes in between have been moved
          // already, and we can safely retain this item's opcode.
          if (!seenUnretained) {
            this.retainItem(itemOpcode, item);
            currentOpcodeIndex = seenIndex + 1;
          } else {
            this.moveItem(itemOpcode, item, opcode);
            currentOpcodeIndex++;
          }
        }
      } else {
        this.insertItem(item, opcode);
      }
    }

    for (const opcode of children) {
      if (!opcode.retained) {
        this.deleteItem(opcode);
      } else {
        opcode.reset();
      }
    }
  }

  private retainItem(opcode: ListItemOpcode, item: OpaqueIterationItem) {
    if (LOCAL_DEBUG) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      logStep!('list-updates', ['retain', item.key]);
    }

    let { children } = this;

    updateRef(opcode.memo, item.memo);
    updateRef(opcode.value, item.value);
    opcode.retained = true;

    opcode.index = children.length;
    children.push(opcode);
  }

  private insertItem(item: OpaqueIterationItem, before: ListItemOpcode | undefined) {
    if (LOCAL_DEBUG) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      logStep!('list-updates', ['insert', item.key]);
    }

    let {
      opcodeMap,
      bounds,
      state,
      children,
      context: { env },
    } = this;
    let { key } = item;
    let nextSibling = before === undefined ? this.marker : before.firstNode();

    let elementStack = NewTreeBuilder.forInitialRender(env, {
      element: bounds.parentElement(),
      nextSibling,
    });

    let vm = state.evaluate(elementStack);

    vm.execute((vm) => {
      let opcode = vm.enterItem(item);

      opcode.index = children.length;
      children.push(opcode);
      opcodeMap.set(key, opcode);
      associateDestroyableChild(this, opcode);
    });
  }

  private moveItem(
    opcode: ListItemOpcode,
    item: OpaqueIterationItem,
    before: ListItemOpcode | undefined
  ) {
    let { children } = this;

    updateRef(opcode.memo, item.memo);
    updateRef(opcode.value, item.value);
    opcode.retained = true;

    let currentSibling, nextSibling;

    if (before === undefined) {
      moveBounds(opcode, this.marker);
    } else {
      currentSibling = opcode.lastNode().nextSibling;
      nextSibling = before.firstNode();

      // Items are moved throughout the algorithm, so there are cases where the
      // the items already happen to be siblings (e.g. an item in between was
      // moved before this move happened). Check to see if they are siblings
      // first before doing the move.
      if (currentSibling !== nextSibling) {
        moveBounds(opcode, nextSibling);
      }
    }

    opcode.index = children.length;
    children.push(opcode);

    if (LOCAL_DEBUG) {
      let type = currentSibling && currentSibling === nextSibling ? 'move-retain' : 'move';
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      logStep!('list-updates', [type, item.key]);
    }
  }

  private deleteItem(opcode: ListItemOpcode) {
    if (LOCAL_DEBUG) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      logStep!('list-updates', ['delete', opcode.key]);
    }

    destroy(opcode);
    clear(opcode);
    this.opcodeMap.delete(opcode.key);
  }
}

/** Shared scratch for allocation-free fast-path iteration. */
const SCRATCH_ITEM: OpaqueIterationItem = { key: null, value: null, memo: null };

/** Replays already-consumed items before draining the rest. */
class PrefixedIterator implements OpaqueIterator {
  private index = 0;

  constructor(
    private prefix: OpaqueIterationItem[],
    private inner: OpaqueIterator
  ) {}

  isEmpty(): boolean {
    return this.index >= this.prefix.length && this.inner.isEmpty();
  }

  next(): Nullable<OpaqueIterationItem> {
    if (this.index < this.prefix.length) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
      return this.prefix[this.index++]!;
    }

    return this.inner.next();
  }
}

