import { Destroyable, Reference, NotifiableReference, ChainableReference } from 'htmlbars-reference';
import { HasGuid } from 'htmlbars-util';

class NotifyNode {
  public parent: PushPullReference;
  public child: NotifiableReference;
  public previousSibling: NotifyNode = null;
  public nextSibling: NotifyNode = null;

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

export abstract class PushPullReference implements Reference, ChainableReference, NotifiableReference, HasGuid {
  protected dirty = true;
  public _notifyTail: NotifyNode = null;
  private sources: Destroyable[] = null;
  public _guid: number = null;

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

  protected _addSource<T extends ChainableReference>(source: T): T {
    this.sources = this.sources || [];
    this.sources.push(source.chain(this));
    return source;
  }

  private _append(child): Unchain {
    let node = new NotifyNode(this, child);

    node.previousSibling = this._notifyTail;
    this._notifyTail = node;

    return new Unchain(this, node);
  }

}

export default PushPullReference;