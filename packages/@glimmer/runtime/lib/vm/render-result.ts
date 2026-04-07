import type {
  AppendingBlock,
  Environment,
  RenderResult,
  SimpleElement,
  SimpleNode,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import { unreachable } from '@glimmer/debug-util';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';

import { clear } from '../bounds';
import { UpdatingVM } from './update';

export default class RenderResultImpl implements RenderResult {
  constructor(
    public env: Environment,
    private updating: UpdatingOpcode[],
    private bounds: AppendingBlock,
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
    unreachable(`this should never happen`);
  }
}
