import { DEBUG } from '@glimmer/env';
import type { Tag } from '@glimmer/interfaces';
import { scheduleRevalidate } from '@glimmer/global-context';
import { createReactiveSystem } from 'alien-signals/system';
import type { Link, ReactiveNode } from 'alien-signals/system';

import { debug } from './debug';
import { unwrap } from './utils';

export type Revision = number;

export const CONSTANT: Revision = 0;
export const INITIAL: Revision = 1;
export const VOLATILE: Revision = NaN;

let $REVISION = INITIAL;

/**
 * The revision of the last write to a tag.
 *
 * A caller can keep this number to learn later if a write occurred.
 */
export function currentRevision(): Revision {
  return $REVISION;
}

export function bump(): void {
  $REVISION++;
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
 * - LIST: a set of tags. It is not in the graph. A check reads the revisions.
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
const VOLATILE_KIND = 7;

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
   * - TAG: the revision of the last write.
   * - LIST: the revision that the last check found.
   * - COMPUTED without subscribers: the revision at which the value was valid.
   */
  revision: Revision = INITIAL;

  /**
   * - LIST, COLLECTOR: the members.
   * - COMPUTED without subscribers: the tags that the last run read.
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
   * - LIST: the revision of the last check.
   */
  mark = 0;

  /**
   * `true` when the last run read `VOLATILE_TAG`. Such a node is always stale.
   */
  volatile = false;

  /**
   * COMPUTED, FRAME: the answer of the last `valueForTag`, and its revision.
   *
   * Without it, each cache in a chain walks the full chain,
   * when nobody subscribes to the chain.
   */
  checked = -1;
  max: Revision = CONSTANT;

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
      park(tag);
    } else if (tag.kind === FRAME_KIND) {
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
CONSTANT_TAG.revision = CONSTANT;

export const VOLATILE_TAG = new TagNode(VOLATILE_KIND, MUTABLE);
VOLATILE_TAG.revision = VOLATILE;
VOLATILE_TAG.volatile = true;

export function isConstTag(tag: Tag): boolean {
  return tag === CONSTANT_TAG;
}

/**
 * Returns a number for the present state of the tag.
 *
 * Give the number to `validateTag` later to learn if the tag changed.
 */
export function valueForTag(_tag: Tag): Revision {
  let tag = _tag as TagNode;

  switch (tag.kind) {
    case TAG_KIND:
    case CONSTANT_KIND:
    case VOLATILE_KIND:
      return tag.revision;

    case LIST_KIND: {
      if (tag.mark !== $REVISION) {
        tag.mark = $REVISION;
        tag.revision = maxRevision(unwrap(tag.tags));
      }

      return tag.revision;
    }

    default: {
      if (tag.volatile) {
        return VOLATILE;
      }

      if (tag.checked === $REVISION) {
        return tag.max;
      }

      let revision = CONSTANT;

      if (tag.tags !== undefined) {
        revision = maxRevision(tag.tags);
      } else {
        for (let dep = tag.deps; dep !== undefined; dep = dep.nextDep) {
          revision = Math.max(revision, valueForTag(dep.dep as TagNode));
        }
      }

      tag.checked = $REVISION;
      tag.max = revision;

      return revision;
    }
  }
}

function maxRevision(tags: TagNode[]): Revision {
  let revision = CONSTANT;

  for (let i = 0; i < tags.length; i++) {
    revision = Math.max(revision, valueForTag(tags[i] as TagNode));
  }

  return revision;
}

export function validateTag(tag: Tag, snapshot: Revision): boolean {
  return snapshot >= valueForTag(tag);
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
      list.mark = -1;
      list.volatile = (tags as TagNode[]).some((tag) => tag.volatile);
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

  tag.revision = ++$REVISION;

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

    if (tag !== undefined) {
      tag.revision = $REVISION;

      let subs = tag.subs;

      if (subs !== undefined) {
        propagate(subs, false);
      }
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

    case VOLATILE_KIND:
      sub.volatile = true;
      break;

    default: {
      let tags = tag.tags;

      if (tag.volatile) sub.volatile = true;

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
      if (tag.tags === undefined && tag.flags === MUTABLE) {
        if (tag.volatile) sub.volatile = true;
        if (tag.deps !== undefined) link(tag, sub, cycle);
      } else {
        linkLeaves(sub, tag);
      }
      break;

    case VOLATILE_KIND:
      /**
       * `sub` can never be valid, and no write will tell it so.
       */
      sub.volatile = true;
      break;
  }
}

function collect(collector: TagNode, tag: TagNode): void {
  if (tag.volatile) collector.volatile = true;

  /**
   * A LIST uses `mark` for its own check, so it can go in two times.
   */
  if (tag.kind === LIST_KIND) {
    unwrap(collector.tags).push(tag);
  } else if (tag.mark !== collector.mark) {
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
  collector.mark = -1;

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
export function createFrame(): TagNode {
  return new TagNode(FRAME_KIND, MUTABLE);
}

export function beginFrame(frame: TagNode, debuggingContext?: string | false): void {
  SUB_STACK.push(activeSub);

  cycle++;
  frame.depsTail = undefined;
  frame.checked = -1;
  frame.volatile = false;
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
  return (frame.flags & STALE) !== 0 || frame.volatile;
}

/**
 * Makes the open frame depend on `frame`.
 */
export function consumeFrame(frame: TagNode): void {
  let sub = activeSub;

  if (sub === undefined || (frame.deps === undefined && !frame.volatile)) return;

  if (DEBUG) {
    unwrap(debug.markTagAsConsumed)(frame);
  }

  if (sub.kind === COLLECTOR_KIND) {
    collect(sub, frame);
  } else {
    if (frame.volatile) sub.volatile = true;
    if (frame.deps !== undefined) link(frame, sub, cycle);
  }
}

export function disposeFrame(frame: TagNode): void {
  disposeDeps(frame);
  frame.flags = MUTABLE | DIRTY;
}

//////////

/**
 * Reads a COMPUTED node, and runs its function first if the value is stale.
 *
 * The node has links to its dependencies only while it has a subscriber.
 * Without a subscriber, it keeps a list of the tags and a revision.
 *
 * Thus a long-lived tag does not keep each cache that read it one time.
 */
export function readComputed<T>(node: TagNode): T {
  let sub = activeSub;
  let watched = (sub !== undefined && sub.kind !== COLLECTOR_KIND) || node.subs !== undefined;
  let flags = node.flags;

  if (flags === 0) {
    evaluate(node, watched);
  } else if (node.tags !== undefined) {
    if (node.volatile || (node.revision !== $REVISION && !(node.revision >= valueForTag(node)))) {
      evaluate(node, watched);
    } else {
      node.revision = $REVISION;
      if (watched) unpark(node);
    }
  } else if ((flags & STALE) !== 0 || node.volatile) {
    evaluate(node, watched);
  }

  /**
   * A node that reads itself during its run gets no link to itself.
   */
  if (
    sub !== undefined &&
    (node.flags & RECURSED_CHECK) === 0 &&
    (node.deps !== undefined || node.tags !== undefined || node.volatile)
  ) {
    if (DEBUG) {
      unwrap(debug.markTagAsConsumed)(node);
    }

    if (sub.kind === COLLECTOR_KIND) {
      collect(sub, node);
    } else {
      if (node.volatile) sub.volatile = true;
      if (node.deps !== undefined) link(node, sub, cycle);
    }
  }

  return node.value as T;
}

function evaluate(node: TagNode, watched: boolean): void {
  let first = node.flags === 0;
  let done = false;
  let collector: TagNode | undefined;

  SUB_STACK.push(activeSub);

  node.volatile = false;
  node.checked = -1;

  if (watched) {
    node.tags = undefined;
    cycle++;
    node.depsTail = undefined;
    node.flags = MUTABLE | RECURSED_CHECK;
    activeSub = node;
  } else {
    if (node.deps !== undefined) disposeDeps(node);

    node.flags = MUTABLE | RECURSED_CHECK;

    collector = new TagNode(COLLECTOR_KIND, MUTABLE);
    collector.tags = [];
    collector.mark = ++collectorId;
    activeSub = collector;
  }

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
    if (activeSub === node || activeSub === collector) {
      if (DEBUG) {
        unwrap(debug.endTrackingTransaction)();
      }

      activeSub = SUB_STACK.pop();
    }

    if (collector === undefined) {
      purgeDeps(node);
    } else if (done) {
      let tags = collector.tags as TagNode[];

      node.tags = tags.length === 0 ? undefined : tags;
      node.volatile = collector.volatile;
      node.revision = $REVISION;
    } else {
      node.tags = undefined;
    }

    if (done) {
      settle(node);
    } else {
      node.flags = first ? 0 : MUTABLE | DIRTY;
    }
  }
}

/**
 * Replaces the links of a COMPUTED that lost its last subscriber by a list.
 */
function park(node: TagNode): void {
  if (node.deps === undefined) return;

  let tags: TagNode[] = [];

  for (let dep: Link | undefined = node.deps; dep !== undefined; dep = dep.nextDep) {
    tags.push(dep.dep as TagNode);
  }

  node.tags = tags;
  node.checked = -1;
  node.revision = (node.flags & STALE) !== 0 ? -1 : $REVISION;
  node.flags = MUTABLE;

  disposeDeps(node);
}

/**
 * Gives a valid COMPUTED its links back, because a subscriber reads it now.
 */
function unpark(node: TagNode): void {
  let tags = node.tags as TagNode[];

  node.tags = undefined;
  node.depsTail = undefined;
  cycle++;

  for (let i = 0; i < tags.length; i++) {
    linkSource(node, tags[i] as TagNode);
  }
}

function linkSource(sub: TagNode, tag: TagNode): void {
  if (tag.kind === COMPUTED_KIND) {
    if (tag.tags !== undefined) {
      unpark(tag);
    }

    if (tag.flags === MUTABLE) {
      if (tag.volatile) sub.volatile = true;
      if (tag.deps !== undefined) link(tag, sub, cycle);
      return;
    }
  }

  linkTag(sub, tag);
}

export function isConstComputed(node: TagNode): boolean {
  return node.flags !== 0 && node.deps === undefined && node.tags === undefined && !node.volatile;
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
