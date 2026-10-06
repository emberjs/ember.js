import { DEBUG } from '@glimmer/env';
import type { Tag } from '@glimmer/interfaces';
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
 * - TAG: a value that code can write. It has subscribers and no dependencies.
 * - LIST: a set of tags. It is not in the graph. A subscriber links to its members.
 * - COMPUTED: a cached function (`createCache`, compute references).
 * - FRAME: a block of updating opcodes that the VM runs again when it is stale.
 * - WATCHER: forwards the writes of its dependencies to one TAG (`updateTag`).
 * - COLLECTOR: an open `track()` frame. It becomes a LIST at the end.
 */
const TAG_KIND = 0;
const LIST_KIND = 1;
const COMPUTED_KIND = 2;
const FRAME_KIND = 3;
const WATCHER_KIND = 4;
const COLLECTOR_KIND = 5;
const CONSTANT_KIND = 6;

/**
 * One class for all kinds keeps the graph walk of alien-signals monomorphic.
 */
export class TagNode implements ReactiveNode, Tag {
  deps: Link | undefined = undefined;
  depsTail: Link | undefined = undefined;
  subs: Link | undefined = undefined;
  subsTail: Link | undefined = undefined;
  flags: number;
  kind: number;

  /**
   * LIST, COLLECTOR: the members.
   */
  tags: TagNode[] | undefined = undefined;

  /**
   * - TAG: its watcher.
   * - WATCHER: its tag.
   */
  peer: TagNode | undefined = undefined;

  /**
   * - COLLECTOR: its id.
   * - other kinds: the id of the last collector that took this tag.
   */
  mark = 0;

  /**
   * FRAME, COMPUTED: `true` when the run read a cache that had lost its links.
   *
   * No write can reach such a node, so it is stale until its next run.
   */
  forced = false;

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

let collectorId = 0;

const FIRED: TagNode[] = [];

const { link, unlink, propagate } = createReactiveSystem({
  /**
   * `checkDirty` calls this function, and this module does not call `checkDirty`.
   *
   * No node has an equality check, so a pending node is always a stale node.
   */
  update() {
    return true;
  },

  notify(watcher: ReactiveNode) {
    FIRED.push(watcher as TagNode);
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

export const CONSTANT_TAG = new TagNode(CONSTANT_KIND, MUTABLE);

export function isConstTag(tag: Tag): boolean {
  return tag === CONSTANT_TAG;
}

export function combine(tags: Tag[]): Tag {
  switch (tags.length) {
    case 0:
      return CONSTANT_TAG;
    case 1:
      return tags[0] as Tag;
    default: {
      let list = new TagNode(LIST_KIND, MUTABLE);
      list.tags = tags as TagNode[];
      return list;
    }
  }
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

  let subs = tag.subs;

  if (subs !== undefined) {
    propagate(subs, false);

    if (FIRED.length > 0) {
      flushWatchers();
    }
  }

  scheduleRevalidate();
}

/**
 * Writes the tag of each watcher that the last `propagate` reached.
 *
 * A watcher fires one time for each write, so two tags that forward to each
 * other do not loop.
 */
function flushWatchers(): void {
  for (let i = 0; i < FIRED.length; i++) {
    let tag = (FIRED[i] as TagNode).peer;

    let subs = tag?.subs;

    if (subs !== undefined) {
      propagate(subs, false);
    }
  }

  for (let i = 0; i < FIRED.length; i++) {
    let watcher = FIRED[i] as TagNode;
    watcher.flags = watcher.peer === undefined ? 0 : WATCHING;
  }

  FIRED.length = 0;
}

/**
 * Makes `tag` change when `source` changes.
 *
 * A later call replaces the source of the tag.
 */
export function updateTag(_tag: Tag, _source: Tag): void {
  let tag = _tag as TagNode;
  let source = _source as TagNode;

  if (DEBUG && tag.kind !== TAG_KIND) {
    throw new Error('Attempted to update a tag that was not updatable');
  }

  let watcher = tag.peer;

  if (watcher === undefined) {
    if (source === CONSTANT_TAG) return;

    watcher = tag.peer = new TagNode(WATCHER_KIND, WATCHING);
    watcher.peer = tag;
  }

  cycle++;
  watcher.depsTail = undefined;
  linkLeaves(watcher, source);
  purgeDeps(watcher);
  watcher.flags = WATCHING;
}

/**
 * Removes the links from other tags to the watcher of `tag`.
 *
 * A watcher that stays linked keeps memory and slows each write of its sources.
 */
export function releaseTag(_tag: Tag): void {
  let watcher = (_tag as TagNode).peer;

  if (watcher !== undefined) {
    disposeDeps(watcher);
  }
}

/**
 * Links `sub` to each TAG that `tag` reads at this time.
 *
 * A stale COMPUTED between a TAG and `sub` stops `propagate`,
 * so the links go to the TAGs directly.
 */
function linkLeaves(sub: TagNode, tag: TagNode): void {
  switch (tag.kind) {
    case TAG_KIND:
      link(tag, sub, cycle);
      break;

    case CONSTANT_KIND:
      break;

    default: {
      let tags = tag.tags;

      if (
        tag.forced ||
        (tag.kind === COMPUTED_KIND && tag.deps === undefined && tag.flags !== MUTABLE)
      ) {
        sub.forced = true;
      }

      if (tags !== undefined) {
        for (let i = 0; i < tags.length; i++) {
          linkLeaves(sub, tags[i] as TagNode);
        }
      } else {
        for (let dep = tag.deps; dep !== undefined; dep = dep.nextDep) {
          linkLeaves(sub, dep.dep as TagNode);
        }
      }
    }
  }
}

function linkTag(sub: TagNode, tag: TagNode): void {
  switch (tag.kind) {
    case TAG_KIND:
      link(tag, sub, cycle);
      break;

    case LIST_KIND: {
      let tags = unwrap(tag.tags);

      for (let i = 0; i < tags.length; i++) {
        linkTag(sub, tags[i] as TagNode);
      }
      break;
    }

    case COMPUTED_KIND:
    case FRAME_KIND:
      if (tag.flags === MUTABLE && !tag.forced) {
        if (tag.deps !== undefined) link(tag, sub, cycle);
      } else {
        linkLeaves(sub, tag);
      }
      break;
  }
}

function collect(collector: TagNode, tag: TagNode): void {
  if (tag.mark !== collector.mark) {
    tag.mark = collector.mark;
    unwrap(collector.tags).push(tag);
  }
}

export function consumeTag(_tag: Tag): void {
  let sub = activeSub;
  let tag = _tag as TagNode;

  if (sub === undefined || tag === CONSTANT_TAG) return;

  if (DEBUG) {
    unwrap(debug.markTagAsConsumed)(tag);
  }

  if (sub.kind === COLLECTOR_KIND) {
    collect(sub, tag);
  } else {
    linkTag(sub, tag);
  }
}

//////////

export function beginTrackFrame(debuggingContext?: string | false): void {
  SUB_STACK.push(activeSub);

  let collector = new TagNode(COLLECTOR_KIND, MUTABLE);
  collector.tags = [];
  collector.mark = ++collectorId;
  activeSub = collector;

  if (DEBUG) {
    unwrap(debug.beginTrackingTransaction)(debuggingContext);
  }
}

export function endTrackFrame(): Tag {
  let collector = activeSub;

  if (DEBUG) {
    if (SUB_STACK.length === 0 || collector?.kind !== COLLECTOR_KIND) {
      throw new Error('attempted to close a tracking frame, but one was not open');
    }

    unwrap(debug.endTrackingTransaction)();
  }

  activeSub = SUB_STACK.pop();

  return collectorToTag(collector as TagNode);
}

function collectorToTag(collector: TagNode): TagNode {
  let tags = collector.tags as TagNode[];

  if (tags.length === 0) {
    return CONSTANT_TAG;
  } else if (tags.length === 1) {
    return tags[0] as TagNode;
  }

  collector.kind = LIST_KIND;

  return collector;
}

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
  if (sub !== undefined && (sub.kind === FRAME_KIND || sub.kind === COMPUTED_KIND)) {
    sub.flags = sub.flags === 0 ? 0 : MUTABLE | DIRTY;
  }
}

export function isTracking(): boolean {
  return activeSub !== undefined;
}

export function track(block: () => void, debugLabel?: string | false): Tag {
  beginTrackFrame(debugLabel);

  let tag;

  try {
    block();
  } finally {
    tag = endTrackFrame();
  }

  return tag;
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
    if (frame?.kind !== FRAME_KIND) {
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
    for (let dep = node.deps; dep !== undefined; dep = dep.nextDep) {
      let tag = dep.dep as TagNode;

      if (tag.kind !== TAG_KIND && (tag.flags & STALE) !== 0) {
        linkLeaves(node, tag);
      }
    }
  }

  node.flags = MUTABLE;
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

  if (sub.kind === COLLECTOR_KIND) {
    collect(sub, frame);
  } else {
    if (frame.forced) sub.forced = true;
    if (frame.deps !== undefined) link(frame, sub, cycle);
  }
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
export function watchTag(frame: TagNode, _tag: Tag): void {
  cycle++;
  frame.depsTail = undefined;
  frame.forced = false;
  linkTag(frame, _tag as TagNode);
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

    if (sub.kind === COLLECTOR_KIND) {
      collect(sub, node);
    } else {
      if (node.forced) sub.forced = true;
      if (node.deps !== undefined) link(node, sub, cycle);
    }
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
