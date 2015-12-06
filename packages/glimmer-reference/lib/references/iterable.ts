import { LinkedList, ListNode, InternedString, Dict, dict, intern, symbol } from 'glimmer-util';
import { RootReference } from '../types';
import UpdatableReference from './root';

export const REFERENCE_ITERATOR: string = symbol("reference-iterator");

export interface ListDelegate {
  retain(key: InternedString, item: RootReference);
  insert(key: InternedString, item: RootReference, before: InternedString);
  move(key: InternedString, item: RootReference, before: InternedString);
  delete(key: InternedString);
  done();
}

class ListItem extends ListNode<UpdatableReference> {
  public key: InternedString;
  public handled: boolean = true;

  constructor(value: UpdatableReference, key: InternedString) {
    super(value);
    this.key = key;
  }

  handle(value: any) {
    this.handled = true;
    this.value.update(value);
  }
}

export class ListManager {
  private array: RootReference;
  private keyPath: InternedString;

  /* tslint:disable:no-unused-variable */
  private map = dict<ListItem>();
  private list = new LinkedList<ListItem>();
  /* tslint:enable:no-unused-variable */

  constructor(array: RootReference, keyPath: InternedString) {
    this.array = array;
    this.keyPath = keyPath;
  }

  iterator(target: ListDelegate): ListIterator {
    let { array, map, list, keyPath } = this;

    let keyFor;

    if (keyPath === '@index') {
      keyFor = (_, index: number) => {
        return String(index);
      };
    } else {
      keyFor = (item: InternedString) => {
        return intern(item[<string>keyPath]);
      };
    }

    return new ListIterator({ array: array.value(), keyFor, target, map, list });
  }

  sync(target: ListDelegate) {
    let iterator = this.iterator(target);
    while (!iterator.next());
  }
}

interface IteratorOptions {
  array: any[];
  keyFor: (obj: any, index: number) => InternedString;
  target: ListDelegate;
  map: Dict<ListItem>;
  list: LinkedList<ListItem>;
}

enum Phase {
  FirstAppend,
  Append,
  Prune,
  Done
}

export class ListIterator {
  /* tslint:disable:no-unused-variable */
  private candidates = dict<ListItem>();
  /* tslint:enable:no-unused-variable*/
  private array: any[];
  private keyFor: (obj, index: number) => InternedString;
  private target: ListDelegate;

  private map: Dict<ListItem>;
  private list: LinkedList<ListItem>;

  private arrayPosition = 0;
  private listPosition: ListItem;
  private phase: Phase = Phase.Append;

  constructor({ array, keyFor, target, map, list }: IteratorOptions) {
    this.array = array;
    this.keyFor = keyFor;
    this.target = target;
    this.map = map;
    this.list = list;

    if (list.isEmpty()) {
      this.phase = Phase.FirstAppend;
    } else {
      this.phase = Phase.Append;
    }

    this.listPosition = list.head();
  }

  advanceToKey(key: InternedString) {
    let { listPosition, candidates, list } = this;

    let seek = listPosition;

    while (seek && seek.key !== key) {
      candidates[<string>seek.key] = seek;
      seek = list.nextNode(seek);
    }

    this.listPosition = seek && list.nextNode(seek);
  }

  next(): boolean {
    while (true) {
      let handled = false;
      switch (this.phase) {
        case Phase.FirstAppend:
          if (this.array.length <= this.arrayPosition) {
            this.startPrune();
          } else {
            handled = this.nextInitialAppend();
          }
          break;
        case Phase.Append: handled = this.nextAppend(); break;
        case Phase.Prune: this.nextPrune(); break;
        case Phase.Done: this.nextDone(); return true;
      }

      if (handled) return false;
    }
  }

  private nextInitialAppend(): boolean {
    let { array, arrayPosition, keyFor, listPosition, map } = this;

    let item = array[this.arrayPosition++];

    if (item === null || item === undefined) return;

    let key = keyFor(item, arrayPosition);
    this.nextInsert(map, listPosition, key, item);
    return true;
  }

  private nextAppend(): boolean {
    let { keyFor, array, listPosition, arrayPosition, map } = this;

    if (array.length <= arrayPosition) {
      this.startPrune();
      return;
    }

    let item = array[this.arrayPosition++];

    if (item === null || item === undefined) return;

    let key = keyFor(item, arrayPosition);

    if (listPosition && listPosition.key === key) {
      this.nextRetain(listPosition, key, item);
      return false;
    } else if (map[<string>key]) {
      this.nextMove(map, listPosition, key, item);
      return false;
    } else {
      this.nextInsert(map, listPosition, key, item);
      return true;
    }
  }

  private nextRetain(current: ListItem, key: InternedString, item: any) {
    current.handle(item);
    this.listPosition = this.list.nextNode(current);
    this.target.retain(key, item);
  }

  private nextMove(map: Dict<ListItem>, current: ListItem, key: InternedString, item: any) {
    let { candidates, list, target } = this;
    let found = map[<string>key];
    found.handle(item);

    if (candidates[<string>key]) {
      list.remove(found);
      list.insertBefore(found, current);
      target.move(found.key, found.value, current ? current.key : null);
    } else {
      this.advanceToKey(key);
    }
  }

  private nextInsert(map: Dict<ListItem>, current: ListItem, key: InternedString, item: any) {
    let { list, target } = this;

    let reference = new UpdatableReference(item);
    let node = map[<string>key] = new ListItem(reference, key);
    list.append(node);
    target.insert(node.key, node.value, current ? current.key : null);
  }

  private startPrune(): boolean {
    this.phase = Phase.Prune;
    this.listPosition = this.list.head();
    return true;
  }

  private nextPrune() {
    let { list, target } = this;

    if (this.listPosition === null) {
      this.phase = Phase.Done;
      return;
    }

    let node = this.listPosition;
    this.listPosition = list.nextNode(node);

    if (node.handled) {
      node.handled = false;
      return;
    } else {
      list.remove(node);
      delete this.map[<string>node.key];
      target.delete(node.key);
      return;
    }
  }

  private nextDone() {
    this.target.done();
  }
}
