import { DEBUG } from '@glimmer/env';
import type { Tag, TagNode as TagNodeInterface } from '@glimmer/interfaces';
import { scheduleRevalidate } from '@glimmer/global-context';
import { createReactiveSystem } from 'alien-signals/system';
import type { Link, ReactiveNode } from 'alien-signals/system';

import { debug } from './debug';
import { unwrap } from './utils';

let writes = 0;

/**
 * The number of writes to tags since the start of the program.
 *
 * A caller can keep this number to learn later if any write occurred.
 */
export function writeCount(): number {
  return writes;
}

/**
 * The flag values of `alien-signals/system`.
 *
 * The library exports them as an object. Constants let the minifier inline them.
 */
const MUTABLE = 1;
const WATCHING = 2;
const RECURSED_CHECK = 4;
const DIRTY = 16;
const PENDING = 32;
const STALE = DIRTY | PENDING;

/**
 * - TAG: a value that code can write. A TAG can follow other tags (`updateTag`).
 * - COMPUTED: a cached function (`createCache`, compute references).
 * - FRAME: a subscriber that its owner runs again, or links again, when it is stale.
 */
const TAG_KIND = 0;
const COMPUTED_KIND = 2;
const FRAME_KIND = 3;

/**
 * One class for all kinds keeps the graph walk of alien-signals monomorphic.
 */
export class TagNode implements ReactiveNode, TagNodeInterface {
  deps: Link | undefined = undefined;
  depsTail: Link | undefined = undefined;
  subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;
  flags: number;
  kind: number;

  /**
   * The number of the last walk that passed this node.
   */
  mark = 0;

  /**
   * FRAME, COMPUTED: `true` when the run read a cache that had lost its links.
   *
   * No write can reach such a node, so it is stale until its next run.
   */
  forced = false;

  /**
   * TAG: `true` after a write to the tag, or to a tag that it follows.
   */
  stale = false;

  /**
   * FRAME: `true` when an owner removes the links with `disposeFrame`.
   *
   * Such a frame keeps its links when its last subscriber goes away.
   */
  owned = false;

  fn: (() => unknown) | undefined = undefined;
  value: unknown = undefined;
  debugLabel?: string | false | undefined;

  constructor(kind: number, flags: number) {
    this.kind = kind;
    this.flags = flags;
  }
}

let activeSub: TagNode | undefined = undefined;
const SUB_STACK: (TagNode | undefined)[] = [];

/**
 * alien-signals uses this number to find a dependency that a run links twice.
 */
let cycle = 0;

/**
 * A walk over the dependencies of a node skips a node that it passed before.
 * Two tags can follow each other, so a walk can come back to its start.
 */
let walk = 0;

const { link, unlink, propagate } = createReactiveSystem({
  /**
   * `checkDirty` calls this function, and this module does not call `checkDirty`.
   *
   * No node has an equality check, so a pending node is always a stale node.
   */
  update() {
    return true;
  },

  /**
   * `propagate` calls this for a TAG that follows other tags.
   */
  notify(tag: ReactiveNode) {
    (tag as TagNode).stale = true;
  },

  unwatched(node: ReactiveNode) {
    let tag = node as TagNode;

    if (tag.kind === COMPUTED_KIND) {
      /**
       * The next read runs the function again.
       */
      if (tag.deps !== undefined) {
        disposeDeps(tag);
        tag.flags = MUTABLE | DIRTY;
      }
    } else if (tag.kind === FRAME_KIND && !tag.owned) {
      disposeDeps(tag);
      tag.flags = MUTABLE | DIRTY;
    }
  },
});

function disposeDeps(sub: TagNode): void {
  let current = sub.depsTail;

  while (current !== undefined) {
    let prev = current.prevDep;
    unlink(current, sub);
    current = prev;
  }
}

function purgeDeps(sub: TagNode): void {
  let depsTail = sub.depsTail;
  let dep = depsTail !== undefined ? depsTail.nextDep : sub.deps;

  while (dep !== undefined) {
    dep = unlink(dep, sub);
  }
}

//////////

export function createTag(): TagNode {
  return new TagNode(TAG_KIND, MUTABLE);
}

/**
 * A tag that never changes: a list of tags with no member.
 */
export const CONSTANT_TAG: Tag = Object.freeze([]);

export function isConstTag(tag: Tag): boolean {
  return tag === CONSTANT_TAG;
}

export function dirtyTag(_tag: Tag, disableConsumptionAssertion?: boolean): void {
  let tag = _tag as TagNode;

  if (DEBUG && tag.kind !== TAG_KIND) {
    throw new Error('Attempted to dirty a tag that was not dirtyable');
  }

  if (DEBUG && disableConsumptionAssertion !== true) {
    unwrap(debug.assertTagNotConsumed)(tag);
  }

  writes++;
  tag.stale = true;

  let subs = tag.subs;

  if (subs !== undefined) {
    propagate(subs, false);
  }

  scheduleRevalidate();
}

/**
 * Makes `tag` change when `source` changes, and makes `tag` fresh.
 *
 * A later call replaces the source of the tag.
 */
export function updateTag(_tag: Tag, source: Tag): void {
  let tag = _tag as TagNode;

  if (DEBUG && tag.kind !== TAG_KIND) {
    throw new Error('Attempted to update a tag that was not updatable');
  }

  cycle++;
  walk++;
  tag.depsTail = undefined;
  linkLeaves(tag, source);
  purgeDeps(tag);
  settle(tag);
}

/**
 * `false` after a write to the tag, or to a tag that it follows.
 *
 * `updateTag`, `freshenTag`, and a run between `beginFrame` and `endFrame`
 * make the tag fresh again.
 */
export function isTagFresh(tag: Tag): boolean {
  return !(tag as TagNode).stale;
}

export function freshenTag(tag: Tag): void {
  (tag as TagNode).stale = false;
}

/**
 * Removes the links from other tags to `tag`.
 *
 * A tag that stays linked keeps memory and slows each write to its sources.
 */
export function releaseTag(tag: Tag): void {
  disposeDeps(tag as TagNode);
}

/**
 * `propagate` stops at a node that it marked before.
 *
 * A TAG has no function to run again, so it can let the next write through at once.
 * Its `stale` field keeps the fact that a write reached it.
 */
function linkLeaf(sub: TagNode, tag: TagNode): void {
  if ((tag.flags & STALE) !== 0) {
    tag.flags = MUTABLE | WATCHING;
  }

  link(tag, sub, cycle);
}

/**
 * Links `sub` to each TAG that `tag` depends on at this time.
 *
 * A stale COMPUTED or FRAME between a TAG and `sub` stops `propagate`,
 * so `sub` needs its own link to each TAG below it.
 *
 * The caller increments `walk` first.
 */
function linkLeaves(sub: TagNode, tag: Tag): void {
  if (Array.isArray(tag)) {
    for (let i = 0; i < tag.length; i++) {
      linkLeaves(sub, tag[i] as Tag);
    }
    return;
  }

  let node = tag as TagNode;

  if (node === sub) return;

  if (node.kind === TAG_KIND) {
    linkLeaf(sub, node);
    return;
  }

  if (node.mark === walk) return;

  node.mark = walk;

  if (node.forced || (node.deps === undefined && node.flags !== MUTABLE)) {
    sub.forced = true;
  }

  for (let dep = node.deps; dep !== undefined; dep = dep.nextDep) {
    linkLeaves(sub, dep.dep as TagNode);
  }
}

function linkTag(sub: TagNode, tag: Tag): void {
  if (Array.isArray(tag)) {
    for (let i = 0; i < tag.length; i++) {
      linkTag(sub, tag[i] as Tag);
    }
    return;
  }

  let node = tag as TagNode;

  if (node === sub) return;

  if (node.kind === TAG_KIND) {
    linkLeaf(sub, node);
  } else if (node.flags === MUTABLE && !node.forced) {
    if (node.deps !== undefined) link(node, sub, cycle);
  } else {
    walk++;
    linkLeaves(sub, node);
  }
}

export function consumeTag(_tag: Tag): void {
  let sub = activeSub;

  if (sub === undefined) return;

  if (DEBUG) {
    unwrap(debug.markTagAsConsumed)(_tag);
  }

  linkTag(sub, _tag);
}

//////////

export function beginUntrackFrame(): void {
  SUB_STACK.push(activeSub);
  activeSub = undefined;
}

export function endUntrackFrame(): void {
  if (DEBUG && SUB_STACK.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }

  activeSub = SUB_STACK.pop();
}

/**
 * Use this function only after an error, to get back to a valid state.
 */
export function resetTracking(): string | void {
  while (activeSub !== undefined || SUB_STACK.length > 0) {
    abandon(activeSub);
    activeSub = SUB_STACK.pop();
  }

  if (DEBUG) {
    return unwrap(debug.resetTrackingTransaction)();
  }
}

function abandon(sub: TagNode | undefined): void {
  if (sub !== undefined) {
    sub.stale = true;
    sub.flags = sub.flags === 0 ? 0 : MUTABLE | DIRTY;
  }
}

export function isTracking(): boolean {
  return activeSub !== undefined;
}

/**
 * Runs `block` with `tag` as the subscriber.
 *
 * After the run, `tag` is fresh, and it changes when a tag that `block` read changes.
 */
export function trackInto(tag: Tag, block: () => void, debugLabel?: string | false): void {
  beginFrame(tag as TagNode, debugLabel);

  try {
    block();
  } finally {
    endFrame();
  }
}

/**
 * Runs `block` in a new frame, and returns the frame.
 */
export function track(block: () => void, debugLabel?: string | false): TagNode {
  let frame = createFrame();

  beginFrame(frame, debugLabel);

  try {
    block();
  } finally {
    endFrame();
  }

  return frame;
}

export function untrack<T>(callback: () => T): T {
  beginUntrackFrame();

  try {
    return callback();
  } finally {
    endUntrackFrame();
  }
}

//////////

/**
 * A frame is the subscriber for a block of updating opcodes.
 *
 * The owner runs the block between `beginFrame` and `endFrame`.
 * When `isFrameStale` answers `true`, the owner runs the block again.
 */
export function createFrame(owned = false): TagNode {
  let frame = new TagNode(FRAME_KIND, MUTABLE);
  frame.owned = owned;
  return frame;
}

export function beginFrame(frame: TagNode, debuggingContext?: string | false): void {
  SUB_STACK.push(activeSub);

  cycle++;
  frame.depsTail = undefined;
  frame.forced = false;
  frame.flags = MUTABLE | RECURSED_CHECK;
  activeSub = frame;

  if (DEBUG) {
    unwrap(debug.beginTrackingTransaction)(debuggingContext);
  }
}

export function endFrame(): void {
  let frame = activeSub;

  if (DEBUG) {
    if (frame === undefined || frame.kind === COMPUTED_KIND) {
      throw new Error('attempted to close a frame, but one was not open');
    }

    unwrap(debug.endTrackingTransaction)();
  }

  activeSub = SUB_STACK.pop();

  purgeDeps(frame as TagNode);
  settle(frame as TagNode);
}

/**
 * Ends a run of a FRAME or a COMPUTED.
 *
 * A write to a tag that this run read earlier does not make the node stale.
 *
 * Such a write can leave a dependency stale.
 * A stale dependency stops `propagate`.
 * Links to the TAGs below it keep later writes visible.
 */
function settle(node: TagNode): void {
  if ((node.flags & PENDING) !== 0) {
    walk++;

    for (let dep = node.deps; dep !== undefined; dep = dep.nextDep) {
      let tag = dep.dep as TagNode;

      if ((tag.flags & STALE) !== 0) {
        linkLeaves(node, tag);
      }
    }
  }

  node.stale = false;
  node.flags = node.kind === TAG_KIND && node.deps !== undefined ? MUTABLE | WATCHING : MUTABLE;
}

/**
 * Closes `frame` after an error stopped its run.
 */
export function abandonFrame(frame: TagNode): void {
  while (activeSub !== undefined || SUB_STACK.length > 0) {
    let sub = activeSub;
    activeSub = SUB_STACK.pop();

    if (sub === frame) break;
  }

  frame.flags = MUTABLE | DIRTY;
}

export function isFrameStale(frame: TagNode): boolean {
  return (frame.flags & STALE) !== 0 || frame.forced;
}

/**
 * Makes the open frame depend on `frame`.
 */
export function consumeFrame(frame: TagNode): void {
  let sub = activeSub;

  if (sub === undefined || (frame.deps === undefined && !frame.forced)) return;

  if (DEBUG) {
    unwrap(debug.markTagAsConsumed)(frame);
  }

  if (frame.forced) sub.forced = true;
  if (frame.deps !== undefined) link(frame, sub, cycle);
}

export function disposeFrame(frame: TagNode): void {
  disposeDeps(frame);
  frame.flags = MUTABLE | DIRTY;
}

//////////

/**
 * Makes `frame` depend on `tag` only, and makes it not stale.
 *
 * Use it for a subscriber that has no block to run:
 * the owner asks `isFrameStale` later, and then calls this function again.
 */
export function watchTag(frame: TagNode, tag: Tag): void {
  cycle++;
  frame.depsTail = undefined;
  frame.forced = false;
  linkTag(frame, tag);
  purgeDeps(frame);
  frame.flags = MUTABLE;
}

//////////

/**
 * Reads a COMPUTED node, and runs its function first if the value is stale.
 */
export function readComputed<T>(node: TagNode): T {
  let flags = node.flags;

  if (flags === 0 || (flags & STALE) !== 0 || node.forced) {
    evaluate(node);
  }

  let sub = activeSub;

  /**
   * A node that reads itself during its run gets no link to itself.
   */
  if (
    sub !== undefined &&
    (node.flags & RECURSED_CHECK) === 0 &&
    (node.deps !== undefined || node.forced)
  ) {
    if (DEBUG) {
      unwrap(debug.markTagAsConsumed)(node);
    }

    if (node.forced) sub.forced = true;
    if (node.deps !== undefined) link(node, sub, cycle);
  }

  return node.value as T;
}

function evaluate(node: TagNode): void {
  let first = node.flags === 0;
  let done = false;

  SUB_STACK.push(activeSub);

  cycle++;
  node.forced = false;
  node.depsTail = undefined;
  node.flags = MUTABLE | RECURSED_CHECK;
  activeSub = node;

  if (DEBUG) {
    unwrap(debug.beginTrackingTransaction)(node.debugLabel);
  }

  try {
    node.value = (node.fn as () => unknown)();
    done = true;
  } finally {
    /**
     * `resetTracking` can empty the stack before this point, after an error.
     */
    if (activeSub === node) {
      if (DEBUG) {
        unwrap(debug.endTrackingTransaction)();
      }

      activeSub = SUB_STACK.pop();
    }

    purgeDeps(node);

    if (done) {
      settle(node);
    } else {
      node.flags = first ? 0 : MUTABLE | DIRTY;
    }
  }
}

export function isConstComputed(node: TagNode): boolean {
  return node.flags !== 0 && node.deps === undefined && !node.forced;
}

export function createComputed<T>(fn: () => T, debugLabel?: string | false): TagNode {
  let node = new TagNode(COMPUTED_KIND, 0);
  node.fn = fn;

  if (DEBUG) {
    node.debugLabel = debugLabel;
  }

  return node;
}

//////////

declare const CACHE_KEY: unique symbol;

export interface Cache<T = unknown> {
  [CACHE_KEY]: T;
}

export function createCache<T>(fn: () => T, debuggingLabel?: string | false): Cache<T> {
  if (DEBUG && !(typeof fn === 'function')) {
    throw new Error(
      `createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
    );
  }

  return createComputed(fn, debuggingLabel) as unknown as Cache<T>;
}

export function getValue<T>(cache: Cache<T>): T | undefined {
  assertCache(cache, 'getValue');

  return readComputed<T>(cache);
}

export function isConst(cache: Cache): boolean {
  assertCache(cache, 'isConst');

  if (DEBUG && cache.flags === 0) {
    throw new Error(
      `isConst() can only be used on a cache once getValue() has been called at least once. Called with cache function:\n\n${String(
        cache.fn
      )}`
    );
  }

  return isConstComputed(cache);
}

function assertCache(value: unknown, fnName: string): asserts value is TagNode {
  if (DEBUG && !(value instanceof TagNode && value.kind === COMPUTED_KIND)) {
    throw new Error(
      `${fnName}() can only be used on an instance of a cache created with createCache(). Called with: ${String(
        value
      )}`
    );
  }
}
