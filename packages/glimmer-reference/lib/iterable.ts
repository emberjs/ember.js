import { FIXME, LinkedList, ListNode, InternedString, Opaque, dict } from 'glimmer-util';
import { VersionedPathReference as PathReference } from './validators';

export interface IterationItem<T, U> {
  key: string;
  value: T;
  memo: U;
}

export interface AbstractIterator<T, U, V extends IterationItem<T, U>> {
  isEmpty(): boolean;
  next(): V;
}

export interface AbstractIterable<T, U, ItemType extends IterationItem<T, U>, ValueReferenceType extends PathReference<T>, MemoReferenceType extends PathReference<U>> {
  iterate(): AbstractIterator<T, U, ItemType>;

  valueReferenceFor(item: ItemType): ValueReferenceType;
  updateValueReference(reference: ValueReferenceType, item: ItemType);

  memoReferenceFor(item: ItemType): MemoReferenceType;
  updateMemoReference(reference: MemoReferenceType, item: ItemType);
}

export type Iterator<T, U> = AbstractIterator<T, U, IterationItem<T, U>>;
export type Iterable<T, U> = AbstractIterable<T, U, IterationItem<T, U>, PathReference<T>, PathReference<U>>;

type OpaqueIterationItem = IterationItem<Opaque, Opaque>;
export type OpaqueIterator = AbstractIterator<Opaque, Opaque, OpaqueIterationItem>;
export type OpaqueIterable = AbstractIterable<Opaque, Opaque, OpaqueIterationItem, PathReference<Opaque>, PathReference<Opaque>>;

class ListItem extends ListNode<PathReference<Opaque>> implements IterationItem<PathReference<Opaque>, PathReference<Opaque>> {
  public key: InternedString;
  public memo: PathReference<Opaque>;
  public retained: boolean = false;
  public seen: boolean = false;
  private iterable: OpaqueIterable;

  constructor(iterable: OpaqueIterable, result: OpaqueIterationItem) {
    super(iterable.valueReferenceFor(result));
    this.key = result.key as FIXME<'user string to InternedString'>;
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
  private iterable: OpaqueIterable;
  private iterator: OpaqueIterator;
  private map = dict<ListItem>();
  private list = new LinkedList<ListItem>();

  constructor(iterable: OpaqueIterable) {
    this.iterable = iterable;
  }

  isEmpty(): boolean {
    let iterator = this.iterator = this.iterable.iterate();
    return iterator.isEmpty();
  }

  iterate(): OpaqueIterator {
    let iterator = this.iterator || this.iterable.iterate();
    this.iterator = null;

    return iterator;
  }

  has(key: string): boolean {
    return !!this.map[key];
  }

  get(key: string): ListItem {
    return this.map[key];
  }

  wasSeen(key: string): boolean {
    let node = this.map[key];
    return node && node.seen;
  }

  append(item: OpaqueIterationItem): ListItem {
    let { map, list, iterable } = this;
    let node = map[item.key] = new ListItem(iterable, item);

    list.append(node);
    return node;
  }

  insertBefore(item: OpaqueIterationItem, reference: ListItem): ListItem {
    let { map, list, iterable } = this;

    let node = map[item.key] = new ListItem(iterable, item);
    node.retained = true;
    list.insertBefore(node, reference);
    return node;
  }

  move(item: ListItem, reference: ListItem) {
    let { list } = this;

    item.retained = true;
    list.remove(item);
    list.insertBefore(item, reference);
  }

  remove(item: ListItem) {
    let { list } = this;

    list.remove(item);
    delete this.map[<string>item.key];
  }

  nextNode(item: ListItem) {
    return this.list.nextNode(item);
  }

  head() {
    return this.list.head();
  }
}

export class ReferenceIterator {
  public artifacts: IterationArtifacts;
  private iterator: OpaqueIterator = null;

  // if anyone needs to construct this object with something other than
  // an iterable, let @wycats know.
  constructor(iterable: OpaqueIterable) {
    let artifacts = new IterationArtifacts(iterable);
    this.artifacts = artifacts;
  }

  next(): ListItem {
    let { artifacts } = this;

    let iterator = (this.iterator = this.iterator || artifacts.iterate());

    let item = iterator.next();

    if (!item) return null;

    return artifacts.append(item);
  }
}

export interface IteratorSynchronizerDelegate {
  retain(key: InternedString, item: PathReference<Opaque>, memo: PathReference<Opaque>);
  insert(key: InternedString, item: PathReference<Opaque>, memo: PathReference<Opaque>, before: InternedString);
  move(key: InternedString, item: PathReference<Opaque>, memo: PathReference<Opaque>, before: InternedString);
  delete(key: InternedString);
  done();
}

interface IteratorSynchronizerOptions {
  target: IteratorSynchronizerDelegate;
  artifacts: IterationArtifacts;
}

enum Phase {
  Append,
  Prune,
  Done
}

export class IteratorSynchronizer {
  private target: IteratorSynchronizerDelegate;
  private iterator: OpaqueIterator;
  private current: ListItem;
  private artifacts: IterationArtifacts;

  constructor({ target, artifacts }: IteratorSynchronizerOptions) {
    this.target = target;
    this.artifacts = artifacts;
    this.iterator = artifacts.iterate();
    this.current = artifacts.head();
  }

  sync() {
    let phase: Phase = Phase.Append;

    while (true) {
      switch (phase) {
        case Phase.Append: phase = this.nextAppend(); break;
        case Phase.Prune: phase = this.nextPrune(); break;
        case Phase.Done: this.nextDone(); return;
      }
    }
  }

  private advanceToKey(key: InternedString) {
    let { current, artifacts } = this;

    let seek = current;

    while (seek && seek.key !== key) {
      seek.seen = true;
      seek = artifacts.nextNode(seek);
    }

    this.current = seek && artifacts.nextNode(seek);
  }

  private nextAppend(): Phase {
    let { iterator, current, artifacts } = this;

    let item = iterator.next();

    if (item === null) {
      return this.startPrune();
    }

    let { key } = item;

    if (current && current.key === key) {
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

    current.update(item);
    this.current = artifacts.nextNode(current);
    this.target.retain(item.key as FIXME<'user string to InternedString'>, current.value, current.memo);
  }

  private nextMove(item: OpaqueIterationItem) {
    let { current, artifacts, target } = this;
    let { key } = item;

    let found = artifacts.get(item.key);
    found.update(item);

    if (artifacts.wasSeen(item.key)) {
      artifacts.move(found, current);
      target.move(found.key, found.value, found.memo, current ? current.key : null);
    } else {
      this.advanceToKey(key as FIXME<'user string to InternedString'>);
    }
  }

  private nextInsert(item: OpaqueIterationItem) {
    let { artifacts, target, current } = this;

    let node = artifacts.insertBefore(item, current);
    target.insert(node.key, node.value, node.memo, current ? current.key : null);
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
      target.delete(node.key);
    } else {
      node.reset();
    }

    return Phase.Prune;
  }

  private nextDone() {
    this.target.done();
  }
}
