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
  Revision,
  Scope,
  SimpleComment,
  Tag,
  UpdatingOpcode,
  UpdatingVM as IUpdatingVM,
} from '@glimmer/interfaces';
import type { OpaqueIterationItem, OpaqueIterator } from '@glimmer/reference/lib/iterable';
import type { Reference } from '@glimmer/reference/lib/reference';
import { expect, unwrap } from '@glimmer/debug-util/lib/platform-utils';
import { associateDestroyableChild, destroy, destroyChildren } from '@glimmer/destroyable';
import { DESTROYABLE_META_KEY } from '@glimmer/util/lib/destroyable-key';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { updateRef, valueForRef } from '@glimmer/reference/lib/reference';
import { logStep } from '@glimmer/util/lib/debug-steps';
import { StackImpl as Stack } from '@glimmer/util/lib/collections';
import { debug } from '@glimmer/validator/lib/debug';
import {
  beginTrackFrame,
  beginUntrackFrame,
  consumeTag,
  endTrackFrame,
  endUntrackFrame,
  resetTracking,
  trackFrameDepth,
} from '@glimmer/validator/lib/tracking';
import { INITIAL, validateTag, valueForTag } from '@glimmer/validator/lib/validators';

import type { Closure } from './append';
import type { AppendingBlockList } from './element-builder';

import { clear, move as moveBounds } from '../bounds';
import { NewTreeBuilder } from './element-builder';

export class UpdatingVM implements IUpdatingVM {
  public env: Environment;
  public dom: GlimmerTreeChanges;
  public alwaysRevalidate: boolean;

  private frameStack: Stack<UpdatingVMFrame> = new Stack<UpdatingVMFrame>();

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
      let hasErrored = true;
      try {
        this._execute(opcodes, handler);
        hasErrored = false;
      } finally {
        // `{{#each}}` items open a tracking frame that is closed when their
        // frame is popped, so an exception that escapes the loop leaves it
        // open: `CURRENT_TRACKER` would keep pointing at a dead item and
        // the next balanced `endTrackFrame` (a component's, say) would pop
        // the wrong one, corrupting every tag computed afterwards. Only the
        // DEBUG branch above used to reset, so in production a single
        // render error poisoned autotracking for the rest of the page.
        if (hasErrored) resetTracking();
      }
    }
  }

  private _execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler) {
    let { frameStack } = this;

    this.try(opcodes, handler);

    while (!frameStack.isEmpty()) {
      let opcode = this.frame.nextStatement();

      if (opcode === undefined) {
        let frame = expect(frameStack.pop(), 'bug: expected a frame');

        frame.finalize(false);
        continue;
      }

      opcode.evaluate(this);
    }
  }

  private get frame() {
    return expect(this.frameStack.current, 'bug: expected a frame');
  }

  goto(index: number) {
    this.frame.goto(index);
  }

  try(
    ops: UpdatingOpcode[],
    handler: Nullable<ExceptionHandler>,
    finalizer?: (didError: boolean) => void
  ) {
    this.frameStack.push(new UpdatingVMFrame(ops, handler, finalizer));
  }

  throw() {
    this.frame.handleException();

    let frame = expect(this.frameStack.pop(), 'bug: expected a frame');

    frame.finalize(true);
  }
}

export interface VMState {
  readonly pc: number;
  readonly scope: Scope;
  readonly dynamicScope: DynamicScope;
  readonly stack: unknown[];
}

export abstract class BlockOpcode implements UpdatingOpcode, Bounds {
  [DESTROYABLE_META_KEY]: object | undefined;

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
    let { subtreeTag } = this;

    if (
      subtreeTag !== null &&
      !vm.alwaysRevalidate &&
      validateTag(subtreeTag, this.subtreeRevision)
    ) {
      if (LOCAL_DEBUG) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        logStep!('list-item-subtrees', ['skip', this.key]);
      }

      // propagate this item's dependencies to any enclosing tracking
      // frame, exactly as executing the children would have
      consumeTag(subtreeTag);
      return;
    }

    if (LOCAL_DEBUG) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      logStep!('list-item-subtrees', ['walk', this.key]);
    }

    // The frame opened here is closed from the finalizer below, once the
    // children have run -- so by then it is not necessarily the innermost
    // one. `vm.throw()` unwinds a single frame, and a component's
    // `BeginTrackFrameOpcode`/`EndTrackFrameOpcode` pair lives in the same
    // ops array as the rest of this item's children, so an `Assert` that
    // fires between the two leaves the component's frame open. Closing
    // blindly would hand us that frame's partial tag and then skip this
    // item forever against it. Recording the depth lets us tell that case
    // apart and fall back to "no tag", which only costs a re-render.
    let depth = trackFrameDepth();

    beginTrackFrame();
    vm.try(this.children, this, (didError) => {
      let unbalanced = trackFrameDepth() > depth + 1;
      let tag: Nullable<Tag> = null;

      // always balance, even when unwinding; the last frame closed is ours
      while (trackFrameDepth() > depth) {
        tag = endTrackFrame();
      }

      if (didError || unbalanced || tag === null) return;

      this.subtreeTag = tag;
      this.subtreeRevision = valueForTag(tag);
      consumeTag(tag);
    });
  }

  override handleException() {
    // The children are about to be replaced, so the collected tag no longer
    // describes them. Belt and braces rather than load-bearing: whatever
    // threw did so because a ref this item's tag already covers changed, so
    // the tag is invalid regardless and the item would be walked anyway.
    // Kept because that reasoning holds for today's `Assert`s, not for any
    // future opcode that might unwind on something the tag never saw.
    this.subtreeTag = null;
    super.handleException();
  }

  shouldRemove(): boolean {
    return !this.retained;
  }

  reset() {
    this.retained = false;
  }
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
      // Deriving a fresh array from tracked state is the idiomatic pattern,
      // so the iterator's identity changes on every update even when none
      // of the list's keys did. When the new iteration turns out to match
      // the existing children one-for-one, the item refs can be updated in
      // place -- no marker node, no diff bookkeeping, no children rebuild.
      let replay = this.tryFastSync(iterator);

      if (replay !== null) {
        let { bounds } = this;
        let { dom } = vm;

        let marker = (this.marker = dom.createComment(''));
        dom.insertAfter(
          bounds.parentElement(),
          marker,
          expect(bounds.lastNode(), "can't insert after an empty bounds")
        );

        this.sync(new PrefixedIterator(replay, iterator));

        this.parentElement().removeChild(marker);
        this.marker = null;
      }

      this.lastIterator = iterator;
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  /**
   * Walks the new iteration against the existing children, applying it in
   * place for as long as it matches. Returns null when everything matched
   * in order and in count, which means the update is already complete.
   *
   * Otherwise the items consumed so far still have to reach the full
   * `sync`, which needs the iteration from the beginning -- so the matched
   * prefix is rebuilt (from the opcodes, whose refs were just updated)
   * along with the item that mismatched.
   */
  private tryFastSync(iterator: OpaqueIterator): Nullable<OpaqueIterationItem[]> {
    let { children } = this;
    let matched = 0;

    for (;;) {
      let item = iterator.next();

      if (item === null) {
        // ran out of items: either an exact match, or the list shrank
        return matched === children.length ? null : this.replayPrefix(matched, null);
      }

      let opcode = children[matched];

      if (opcode === undefined || opcode.key !== item.key) {
        return this.replayPrefix(matched, item);
      }

      updateRef(opcode.memo, item.memo);
      updateRef(opcode.value, item.value);
      matched++;
    }
  }

  /**
   * The matched prefix was already applied to the item refs, so those items
   * can be read back off the opcodes.
   *
   * The reads are untracked deliberately. This runs inside whatever
   * tracking frame happens to be open -- an enclosing `{{#each}}` item's,
   * or a component's cache group -- and `valueForRef` consumes. Letting
   * these escape would make that frame depend on every item ref in the
   * list, so any list mutation would invalidate the enclosing component
   * and re-run its update hooks for no reason.
   */
  private replayPrefix(
    matched: number,
    mismatch: Nullable<OpaqueIterationItem>
  ): OpaqueIterationItem[] {
    let { children } = this;
    let prefix: OpaqueIterationItem[] = [];

    beginUntrackFrame();

    try {
      for (let i = 0; i < matched; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
        let opcode = children[i]!;

        prefix.push({
          key: opcode.key,
          value: valueForRef(opcode.value),
          memo: valueForRef(opcode.memo),
        });
      }
    } finally {
      endUntrackFrame();
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

class UpdatingVMFrame {
  private current = 0;

  constructor(
    private ops: UpdatingOpcode[],
    private exceptionHandler: Nullable<ExceptionHandler>,
    private finalizer?: (didError: boolean) => void
  ) {}

  goto(index: number) {
    this.current = index;
  }

  nextStatement(): UpdatingOpcode | undefined {
    return this.ops[this.current++];
  }

  handleException() {
    if (this.exceptionHandler) {
      this.exceptionHandler.handleException();
    }
  }

  finalize(didError: boolean) {
    this.finalizer?.(didError);
  }
}

/**
 * Replays items the fast path already pulled off an iterator, then drains
 * the rest of it, so `sync` can see an iteration from the beginning that
 * has in fact been partly consumed.
 */
class PrefixedIterator implements OpaqueIterator {
  private index = 0;

  constructor(
    private prefix: OpaqueIterationItem[],
    private inner: OpaqueIterator
  ) {}

  /**
   * Only meaningful before the inner iterator has been advanced, which is
   * all `sync` needs -- it drives iteration with `next` alone.
   */
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
