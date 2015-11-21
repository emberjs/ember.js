import { LinkedList, ListNode, InternedString, Dict, dict, intern, symbol } from 'htmlbars-util';
import { Reference, RootReference } from '../types';
import { ConstReference } from './const';
import UpdatableReference from './root';

export const REFERENCE_ITERATOR: string = symbol("reference-iterator");

export interface ListDelegate {
  insert(key: InternedString, item: RootReference, before: InternedString);
  move(key: InternedString, item: RootReference, before: InternedString);
  delete(key: InternedString);
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
  private target: ListDelegate;

  private map = dict<ListItem>();
  private list = new LinkedList<ListItem>();

  constructor(array: RootReference, keyPath: InternedString, target: ListDelegate) {
    this.array = array;
    this.keyPath = keyPath;
    this.target = target;
  }

  isDirty(): boolean {
    return true;
  }

  destroy() {}

  sync() {
    console.log("Syncing...");
    let { array, keyPath, target,list, map } = this;

    if (list.isEmpty()) {  
      return array.value().map(item => {
        let key = intern(item[<string>keyPath]);
        let reference = new UpdatableReference(item);
        let node = map[<string>key] = new ListItem(reference, key);
        list.append(node);
        target.insert(node.key, node.value, null);
      });
    }

    let current = list.head();
    let candidates = dict<ListItem>();

    array.value().forEach(item => {
      let key = intern(item[<string>keyPath]);

      if (current && current.key === key) {
        current.handle(item);
        current = list.nextNode(current);
      } else if (map[<string>key]) {
        let found = map[<string>key];
        found.handle(item);

        if (candidates[<string>key]) {
          target.move(found.key, found.value, current ? current.key : null);
        } else {
          advanceToKey(key);
        }
      } else {
        let reference = new UpdatableReference(item);
        let node = map[<string>key] = new ListItem(reference, key);
        list.append(node);
        target.insert(node.key, node.value, current ? current.key : null);
      }
    });

    list.forEachNode(node => {
      if (node.handled) {
        node.handled = false;
      } else {
        let next = list.nextNode(node);
        list.remove(node);
        delete this.map[<string>node.key];
        target.delete(node.key);
      }
    });

    function advanceToKey(key: InternedString) {
      let seek = current;

      while (seek && seek.key !== key) {
        candidates[<string>seek.key] = seek;
        seek = list.nextNode(seek);
      }
      
      current = seek && list.nextNode(seek);
    }
  }
}