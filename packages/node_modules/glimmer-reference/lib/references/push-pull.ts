import { Destroyable, Reference, NotifiableReference, ChainableReference } from 'glimmer-reference';
import { HasGuid } from 'glimmer-util';

class NotifyNode {
  public parent: PushPullReference<any>;
  public child: NotifiableReference<any>;
  public previousSibling: NotifyNode = null;
  public nextSibling: NotifyNode = null;

  constructor(parent, child) {
    this.parent = parent;
    this.child = child;
  }
}

class Unchain {
  private reference: PushPullReference<any>;
  private notifyNode: NotifyNode;

  constructor(reference: PushPullReference<any>, notifyNode: NotifyNode) {
    this.reference = reference;
    this.notifyNode = notifyNode;
  }

  destroy() {
    let { reference, notifyNode } = this;
    let { nextSibling, previousSibling } = notifyNode;

    if (nextSibling) nextSibling.previousSibling = previousSibling;
    if (previousSibling) previousSibling.nextSibling = nextSibling;

    if (reference._notifyTail === notifyNode) reference._notifyTail = previousSibling;
  }
}

export abstract class PushPullReference<T> implements Reference<T>, ChainableReference<T>, NotifiableReference<T>, HasGuid {
  protected dirty = true;
  public _notifyTail: NotifyNode = null;
  private sources: Destroyable[] = null;
  public _guid: number = null;

  isDirty() { return true; }

  chain(child: NotifiableReference<any>): Destroyable {
    // return this._append(child);
    return null;
  }

  abstract value(): any;

  notify() {
    let notifyNode = this._notifyTail;
    while (notifyNode) {
      // notifyNode.child.notify();
      notifyNode = notifyNode.previousSibling;
    }
  }

  destroy() {
    if (!this.sources) return;
    this.sources.forEach(source => source.destroy());
  }

  protected _addSource<T extends ChainableReference<any>>(source: T): T {
    // this.sources = this.sources || [];
    // this.sources.push(source.chain(this));
    return source;
  }
}

export default PushPullReference;
