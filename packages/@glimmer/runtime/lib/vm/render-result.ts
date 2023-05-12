import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import type {
  Environment,
  LiveBlock,
  RenderResult,
  SimpleElement,
  SimpleNode,
  UpdatingOpcode,
} from '@glimmer/interfaces';

import { clear } from '../bounds';
import { UpdatingVM } from './update';

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
    let vm = new UpdatingVM(env, { alwaysRevalidate });
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
