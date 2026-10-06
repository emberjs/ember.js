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
import { DESTROYABLE_META_KEY } from '@glimmer/util/lib/destroyable-key';
import {
  abandonFrame,
  beginFrame,
  consumeFrame,
  createFrame,
  disposeFrame,
  endFrame,
} from '@glimmer/signals/lib/tags';
import type { TagNode } from '@glimmer/signals/lib/tags';

import { clear } from '../bounds';
import { UpdatingVM } from './update';

export default class RenderResultImpl implements RenderResult {
  [DESTROYABLE_META_KEY]: object | undefined;

  /**
   * The subscriber for all reads of this render.
   *
   * Each block and each reference of the render has a path of links to this
   * frame. When the result is destroyed, the frame drops its links, and that
   * removes the links from the tags of the application to the render.
   */
  root: TagNode | undefined = undefined;

  constructor(
    public env: Environment,
    private updating: UpdatingOpcode[],
    private bounds: AppendingBlock,
    readonly drop: object
  ) {
    associateDestroyableChild(this, drop);
    registerDestructor(this, () => {
      clear(this.bounds);
      if (this.root !== undefined) disposeFrame(this.root);
    });
  }

  rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
    let { env, updating } = this;
    let root = (this.root ??= createFrame(true));
    let vm = new UpdatingVM(env, { alwaysRevalidate });
    let done = false;

    beginFrame(root);

    try {
      vm.execute(updating, this);
      done = true;
    } finally {
      if (done) {
        endFrame();
        consumeFrame(root);
      } else {
        abandonFrame(root);
      }
    }
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
