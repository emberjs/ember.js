import type {
  AppendingBlock,
  Environment,
  RenderResult,
  SimpleElement,
  SimpleNode,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import { unreachable } from '@glimmer/debug-util/lib/platform-utils';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { DESTROYABLE_META_SLOT } from '@glimmer/util/lib/destroyable-slot';

import { clear } from '../bounds';
import { UpdatingVM } from './update';

export default class RenderResultImpl implements RenderResult {
  declare [DESTROYABLE_META_SLOT]: object | undefined;

  constructor(
    public env: Environment,
    private updating: UpdatingOpcode[],
    private bounds: AppendingBlock,
    readonly drop: object
  ) {
    this[DESTROYABLE_META_SLOT] = undefined;

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
