import {
  BasicReference,
  AbstractIterable,
  IterationItem,
  IterationArtifacts,
  ReferenceIterator,
  IteratorSynchronizer,
  IteratorSynchronizerDelegate,
  VersionedPathReference,
  END,
} from '@glimmer/reference';
import { Tag, CURRENT_TAG } from '@glimmer/validator';

import { LinkedList, ListNode } from '@glimmer/util';

type IteratorAction = 'retain' | 'append' | 'insert' | 'move' | 'delete';
type HistoryZip = [IteratorAction, any];

export class Target implements IteratorSynchronizerDelegate<null> {
  private valueMap = new Map<unknown, ListNode<BasicReference<unknown>>>();
  private keyMap = new Map<ListNode<BasicReference<unknown>>, unknown>();
  private list = new LinkedList<ListNode<BasicReference<unknown>>>();
  public tag: Tag = CURRENT_TAG;
  public history: HistoryZip[] = [];

  cleanHistory() {
    this.history = [];
  }

  serializeHistory() {
    return this.history.map((item: any) => item.join(':')).join(',');
  }

  get historyStats() {
    const stats = {
      retain: 0,
      append: 0,
      insert: 0,
      move: 0,
      delete: 0,
    };
    this.history.forEach(([key]: HistoryZip) => {
      stats[key]++;
    });
    return stats;
  }

  retain(_env: null, key: unknown, item: BasicReference<unknown>) {
    if (item !== this.valueMap.get(key)!.value) {
      throw new Error('unstable reference');
    }
    this.history.push(['retain', key]);
  }

  done() {}

  append(key: unknown, item: BasicReference<unknown>) {
    let node = new ListNode(item);
    this.valueMap.set(key, node);
    this.keyMap.set(node, key);
    this.list.append(node);
    this.history.push(['append', key]);
  }

  insert(
    _env: null,
    key: unknown,
    item: BasicReference<unknown>,
    _: BasicReference<unknown>,
    before: unknown
  ) {
    let referenceNode = before === END ? null : this.valueMap.get(before);
    let node = new ListNode(item);
    this.valueMap.set(key, node);
    this.keyMap.set(node, key);
    this.list.insertBefore(node, referenceNode);
    this.history.push(['insert', key]);
  }

  move(
    _env: null,
    key: unknown,
    item: BasicReference<unknown>,
    _: BasicReference<unknown>,
    before: unknown
  ) {
    let referenceNode = before === END ? null : this.valueMap.get(before);
    let node = this.valueMap.get(key)!;

    if (item !== node.value) {
      throw new Error('unstable reference');
    }

    this.list.remove(node);
    this.list.insertBefore(node, referenceNode);
    this.history.push(['move', key]);
  }

  delete(_env: null, key: string) {
    let node = this.valueMap.get(key)!;
    this.valueMap.delete(key);
    this.keyMap.delete(node);
    this.list.remove(node);
    this.history.push(['delete', key]);
  }

  toArray(): BasicReference<unknown>[] {
    return this.list.toArray().map(node => node.value);
  }

  toKeys(): unknown[] {
    return this.list.toArray().map(node => this.keyMap.get(node));
  }

  toValues(): unknown[] {
    return this.toArray().map(ref => ref.value());
  }
}

export function initialize(
  iterable: AbstractIterable<
    unknown,
    unknown,
    IterationItem<unknown, unknown>,
    VersionedPathReference<unknown>,
    VersionedPathReference<unknown>
  >
): {
  artifacts: IterationArtifacts;
  target: Target;
} {
  let target = new Target();
  let iterator = new ReferenceIterator(iterable);
  let item;

  while ((item = iterator.next())) {
    target.append(item.key, item.value);
  }

  return { target, artifacts: iterator.artifacts };
}

export function shuffleArray(array: any) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function getInitialArray(length = 10, firstItem = 0, namePrefix = 'i-') {
  // Array.fill don't work in IE, going to Grow array manually.
  const result = [];
  for (let i = 0; i < length; i++) {
    result.push({
      key: String(i + firstItem),
      name: `${namePrefix}${String(i + firstItem)}`,
    });
  }
  return result;
}

export function sync(target: Target, artifacts: IterationArtifacts) {
  let synchronizer = new IteratorSynchronizer({ target, artifacts, env: null });
  synchronizer.sync();
}
