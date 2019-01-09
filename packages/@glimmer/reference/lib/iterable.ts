import { LinkedList, ListNode, Option, expect } from '@glimmer/util';
import { VersionedPathReference as PathReference, Tag } from './validators';

export interface IterationItem<T, U> {
  key: unknown;
  value: T;
  memo: U;
}

export interface AbstractIterator<T, U, V extends IterationItem<T, U>> {
  isEmpty(): boolean;
  next(): Option<V>;
}

export interface AbstractIterable<
  T,
  U,
  ItemType extends IterationItem<T, U>,
  ValueReferenceType extends PathReference<T>,
  MemoReferenceType extends PathReference<U>
> {
  tag: Tag;
  iterate(): AbstractIterator<T, U, ItemType>;

  valueReferenceFor(item: ItemType): ValueReferenceType;
  updateValueReference(reference: ValueReferenceType, item: ItemType): void;

  memoReferenceFor(item: ItemType): MemoReferenceType;
  updateMemoReference(reference: MemoReferenceType, item: ItemType): void;
}

export type Iterator<T, U> = AbstractIterator<T, U, IterationItem<T, U>>;
export type Iterable<T, U> = AbstractIterable<
  T,
  U,
  IterationItem<T, U>,
  PathReference<T>,
  PathReference<U>
>;

export type OpaqueIterationItem = IterationItem<unknown, unknown>;
export type OpaqueIterator = AbstractIterator<unknown, unknown, OpaqueIterationItem>;
export type OpaquePathReference = PathReference<unknown>;
export type OpaqueIterable = AbstractIterable<
  unknown,
  unknown,
  OpaqueIterationItem,
  OpaquePathReference,
  OpaquePathReference
>;
export type OpaquePathReferenceIterationItem = IterationItem<
  OpaquePathReference,
  OpaquePathReference
>;

export class ListItem extends ListNode<OpaquePathReference> implements OpaqueIterationItem {
  public key: unknown;
  public memo: OpaquePathReference;
  public retained = false;
  public seen = false;
  private iterable: OpaqueIterable;

  constructor(iterable: OpaqueIterable, result: OpaqueIterationItem) {
    super(iterable.valueReferenceFor(result));
    this.key = result.key;
    this.iterable = iterable;
    this.memo = iterable.memoReferenceFor(result);
  }

  update(item: OpaqueIterationItem) {
    this.retained = true;
    this.iterable.updateValueReference(this.value, item);
    this.iterable.updateMemoReference(this.memo, item);
  }

  shouldRemove(): boolean {
    return !this.retained;
  }

  reset() {
    this.retained = false;
    this.seen = false;
  }
}

export class IterationArtifacts {
  public tag: Tag;

  private iterable: OpaqueIterable;
  private iterator: Option<OpaqueIterator> = null;
  private map = new Map<unknown, ListItem>();
  private list = new LinkedList<ListItem>();

  constructor(iterable: OpaqueIterable) {
    this.tag = iterable.tag;
    this.iterable = iterable;
  }

  isEmpty(): boolean {
    let iterator = (this.iterator = this.iterable.iterate());
    return iterator.isEmpty();
  }

  iterate(): OpaqueIterator {
    let iterator: OpaqueIterator;

    if (this.iterator === null) {
      iterator = this.iterable.iterate();
    } else {
      iterator = this.iterator;
    }

    this.iterator = null;

    return iterator;
  }

  has(key: unknown): boolean {
    return this.map.has(key);
  }

  get(key: unknown): ListItem {
    return this.map.get(key)!;
  }

  wasSeen(key: unknown): boolean {
    let node = this.map.get(key);
    return node !== undefined && node.seen;
  }

  append(item: OpaqueIterationItem): ListItem {
    let { map, list, iterable } = this;

    let node = new ListItem(iterable, item);
    map.set(item.key, node);

    list.append(node);
    return node;
  }

  insertBefore(item: OpaqueIterationItem, reference: Option<ListItem>): ListItem {
    let { map, list, iterable } = this;

    let node = new ListItem(iterable, item);
    map.set(item.key, node);
    node.retained = true;
    list.insertBefore(node, reference);
    return node;
  }

  move(item: ListItem, reference: Option<ListItem>): void {
    let { list } = this;

    item.retained = true;
    list.remove(item);
    list.insertBefore(item, reference);
  }

  remove(item: ListItem): void {
    let { list } = this;

    list.remove(item);
    this.map.delete(item.key);
  }

  nextNode(item: ListItem): ListItem {
    return this.list.nextNode(item);
  }

  head(): Option<ListItem> {
    return this.list.head();
  }
}

export class ReferenceIterator {
  public artifacts: IterationArtifacts;
  private iterator: Option<OpaqueIterator> = null;

  // if anyone needs to construct this object with something other than
  // an iterable, let @wycats know.
  constructor(iterable: OpaqueIterable) {
    let artifacts = new IterationArtifacts(iterable);
    this.artifacts = artifacts;
  }

  next(): Option<ListItem> {
    let { artifacts } = this;

    let iterator = (this.iterator = this.iterator || artifacts.iterate());

    let item = iterator.next();

    if (item === null) return null;

    return artifacts.append(item);
  }
}

export interface IteratorSynchronizerDelegate<Env> {
  retain(env: Env, key: unknown, item: PathReference<unknown>, memo: PathReference<unknown>): void;
  insert(
    env: Env,
    key: unknown,
    item: PathReference<unknown>,
    memo: PathReference<unknown>,
    before: Option<unknown>
  ): void;
  move(
    env: Env,
    key: unknown,
    item: PathReference<unknown>,
    memo: PathReference<unknown>,
    before: Option<unknown>
  ): void;
  delete(env: Env, key: unknown): void;
  done(env: Env): void;
}

export interface IteratorSynchronizerOptions<Env> {
  target: IteratorSynchronizerDelegate<Env>;
  artifacts: IterationArtifacts;
  env: Env;
}

enum Phase {
  Append,
  Prune,
  Done,
}

export const END = Symbol();

export class IteratorSynchronizer<Env> {
  private target: IteratorSynchronizerDelegate<Env>;
  private iterator: OpaqueIterator;
  private current: Option<ListItem>;
  private artifacts: IterationArtifacts;
  private env: Env;

  constructor({ target, artifacts, env }: IteratorSynchronizerOptions<Env>) {
    this.target = target;
    this.artifacts = artifacts;
    this.iterator = artifacts.iterate();
    this.current = artifacts.head();
    this.env = env;
  }

  sync() {
    let phase: Phase = Phase.Append;

    while (true) {
      switch (phase) {
        case Phase.Append:
          phase = this.nextAppend();
          break;
        case Phase.Prune:
          phase = this.nextPrune();
          break;
        case Phase.Done:
          this.nextDone();
          return;
      }
    }
  }

  private advanceToKey(key: unknown) {
    let { current, artifacts } = this;

    let seek = current;

    while (seek !== null && seek.key !== key) {
      seek.seen = true;
      seek = artifacts.nextNode(seek);
    }

    if (seek !== null) {
      this.current = artifacts.nextNode(seek);
    }
  }

  private nextAppend(): Phase {
    let { iterator, current, artifacts } = this;

    let item = iterator.next();

    if (item === null) {
      return this.startPrune();
    }

    let { key } = item;

    if (current !== null && current.key === key) {
      this.nextRetain(item);
    } else if (artifacts.has(key)) {
      this.nextMove(item);
    } else {
      this.nextInsert(item);
    }

    return Phase.Append;
  }

  private nextRetain(item: OpaqueIterationItem) {
    let { artifacts, current } = this;

    current = expect(current, 'BUG: current is empty');

    current.update(item);
    this.current = artifacts.nextNode(current);
    this.target.retain(this.env, item.key, current.value, current.memo);
  }

  private nextMove(item: OpaqueIterationItem) {
    let { current, artifacts, target } = this;
    let { key } = item;

    let found = artifacts.get(item.key);
    found.update(item);

    if (artifacts.wasSeen(item.key)) {
      artifacts.move(found, current);
      target.move(this.env, found.key, found.value, found.memo, current ? current.key : END);
    } else {
      this.advanceToKey(key);
    }
  }

  private nextInsert(item: OpaqueIterationItem) {
    let { artifacts, target, current } = this;

    let node = artifacts.insertBefore(item, current);
    target.insert(this.env, node.key, node.value, node.memo, current ? current.key : null);
  }

  private startPrune(): Phase {
    this.current = this.artifacts.head();
    return Phase.Prune;
  }

  private nextPrune(): Phase {
    let { artifacts, target, current } = this;

    if (current === null) {
      return Phase.Done;
    }

    let node = current;
    this.current = artifacts.nextNode(node);

    if (node.shouldRemove()) {
      artifacts.remove(node);
      target.delete(this.env, node.key);
    } else {
      node.reset();
    }

    return Phase.Prune;
  }

  private nextDone() {
    this.target.done(this.env);
  }
}
