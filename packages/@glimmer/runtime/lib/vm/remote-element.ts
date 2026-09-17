import type {
  AppendingBlock,
  Maybe,
  SimpleElement,
  SimpleNode,
  TreeBuilder,
} from '@glimmer/interfaces';
import assert from '@glimmer/debug-util/lib/assert';
import { setLocalDebugType } from '@glimmer/debug-util/lib/debug-brand';
import { registerDestructor } from '@glimmer/destroyable';

import { clear } from '../bounds';

import { AppendingBlockImpl, type NewTreeBuilder } from './element-builder';

/**
 * `{{#in-element}}` support. These were tree builder methods, which kept
 * `RemoteBlock` in every bundle. Every tree builder in this repo extends
 * `NewTreeBuilder`, which is what the casts below rely on.
 */
export function pushRemoteElement(
  tree: TreeBuilder,
  element: SimpleElement,
  guid: string,
  insertBefore: Maybe<SimpleNode>
): AppendingBlock {
  let builder = tree as NewTreeBuilder;

  if (builder.__pushRemoteElement) {
    return builder.__pushRemoteElement(element, guid, insertBefore);
  }

  return defaultPushRemoteElement(builder, element, insertBefore);
}

/** The client behavior, for builders whose hook only adds to it. */
export function defaultPushRemoteElement(
  builder: NewTreeBuilder,
  element: SimpleElement,
  insertBefore: Maybe<SimpleNode>
): AppendingBlock {
  builder.pushElement(element, insertBefore);

  if (insertBefore === undefined) {
    while (element.lastChild) {
      element.removeChild(element.lastChild);
    }
  }

  return builder.pushBlock(new RemoteBlock(element), true);
}

export function popRemoteElement(tree: TreeBuilder): RemoteBlock {
  let builder = tree as NewTreeBuilder;
  const block = builder.popBlock();
  assert(block instanceof RemoteBlock, '[BUG] expecting a RemoteBlock');
  builder.popElement();
  return block;
}

export class RemoteBlock extends AppendingBlockImpl {
  constructor(parent: SimpleElement) {
    super(parent);

    setLocalDebugType('block:remote', this);

    registerDestructor(this, () => {
      // In general, you only need to clear the root of a hierarchy, and should never
      // need to clear any child nodes. This is an important constraint that gives us
      // a strong guarantee that clearing a subtree is a single DOM operation.
      //
      // Because remote blocks are not normally physically nested inside of the tree
      // that they are logically nested inside, we manually clear remote blocks when
      // a logical parent is cleared.
      //
      // HOWEVER, it is currently possible for a remote block to be physically nested
      // inside of the block it is logically contained inside of. This happens when
      // the remote block is appended to the end of the application's entire element.
      //
      // The problem with that scenario is that Glimmer believes that it owns more of
      // the DOM than it actually does. The code is attempting to write past the end
      // of the Glimmer-managed root, but Glimmer isn't aware of that.
      //
      // The correct solution to that problem is for Glimmer to be aware of the end
      // of the bounds that it owns, and once we make that change, this check could
      // be removed.
      //
      // For now, a more targeted fix is to check whether the node was already removed
      // and avoid clearing the node if it was. In most cases this shouldn't happen,
      // so this might hide bugs where the code clears nested nodes unnecessarily,
      // so we should eventually try to do the correct fix.
      if (this.parentElement() === this.firstNode().parentNode) {
        clear(this);
      }
    });
  }
}
