import { Environment, RenderResult, LiveBlock, UpdatingOpcode } from '@glimmer/interfaces';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { SimpleElement, SimpleNode } from '@glimmer/interfaces';
import { clear } from '../bounds';
import UpdatingVMImpl from './update';

export default class RenderResultImpl implements RenderResult {
  constructor(
    public env: Environment,
    private updating: UpdatingOpcode[],
    private bounds: LiveBlock,
    readonly drop: object
  ) {
    associateDestroyableChild(this, drop);
    registerDestructor(this, () => clear(this.bounds));
  }

  rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
    let { env, updating } = this;
    let vm = new UpdatingVMImpl(env, { alwaysRevalidate });
    vm.execute(updating, this);
  }

  parentElement(): SimpleElement {
    return this.bounds.parentElement();
  }

  firstNode(): SimpleNode {
    return this.bounds.firstNode();
  }

  lastNode(): SimpleNode {
    return this.bounds.lastNode();
  }

  handleException() {
    throw 'this should never happen';
  }
}
