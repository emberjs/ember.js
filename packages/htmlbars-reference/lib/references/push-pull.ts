import { guid } from '../utils';
import { Destroyable, Reference, NotifiableReference, ChainableReference } from 'htmlbars-reference';


class NotifyNode {
  public parent: PushPullReference;
  public child: NotifiableReference;
  public previousSibling: NotifyNode;
  public nextSibling: NotifyNode;
  
  constructor(parent, child) {
    this.parent = parent;
    this.child = child;
  }
}

class Unchain {
  private reference: PushPullReference;
  private notifyNode: NotifyNode;
  
  constructor(reference: PushPullReference, notifyNode: NotifyNode) {
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

abstract class PushPullReference implements Reference, ChainableReference, NotifiableReference {
  private dirty: boolean;
  public _notifyTail: NotifyNode;
  private sources: Destroyable[];
  public _guid: number;
  
  constructor() {
    this.dirty = true;
    this._notifyTail = null;
    this.sources = null;
    this._guid = guid();
  }

  isDirty() { return this.dirty; }

  chain(child: NotifiableReference): Destroyable {
    return this._append(child);
  }

  abstract value(): any;

  notify() {
    let notifyNode = this._notifyTail;
    while (notifyNode) {
      notifyNode.child.notify();
      notifyNode = notifyNode.previousSibling;
    }
  }

  destroy() {
    if (!this.sources) return;
    this.sources.forEach(source => source.destroy());
  }

  protected _addSource(source: ChainableReference) {
    this.sources = this.sources || [];
    this.sources.push(source.chain(this));
  }
  
  private _append(child): Unchain {
    let node = new NotifyNode(this, child);

    node.previousSibling = this._notifyTail;
    this._notifyTail = node;

    return new Unchain(this, node);
  }

}

export default PushPullReference;