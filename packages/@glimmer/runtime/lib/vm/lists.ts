import type {
  AppendingBlock,
  Bounds,
  Reference,
  SimpleElement,
  SimpleNode,
  TreeBuilder,
} from '@glimmer/interfaces';
import assert from '@glimmer/debug-util/lib/assert';
import type { OpaqueIterationItem, OpaqueIterator } from '@glimmer/reference/lib/iterable';
import { expect } from '@glimmer/debug-util/lib/platform-utils';

import type { VM } from './append';

import { type NewTreeBuilder } from './element-builder';
import { ListBlockOpcode, type ListItemOpcode } from './update';

/**
 * List iteration for `{{#each}}`. These used to be VM methods, which kept
 * `ListBlockOpcode` in every bundle. The list handlers import them, so a
 * template without `{{#each}}` drops them.
 */
export function enterList(vm: VM, iterableRef: Reference<OpaqueIterator>, offset: number): void {
  let updating: ListItemOpcode[] = [];

  let addr = vm.lowlevel.target(offset);
  let state = vm.capture(0, addr);
  let tree = vm.tree() as NewTreeBuilder;
  let list = tree.pushBlock(new AppendingBlockList(tree.element, updating));

  let opcode = new ListBlockOpcode(state, vm.context, list, updating, iterableRef);

  vm.listStack.push(opcode);

  vm.didEnter(opcode);
}

export function registerItem(vm: VM, opcode: ListItemOpcode): void {
  expect(vm.listStack.current, 'expected a list block').initializeChild(opcode);
}

export function enterItem(vm: VM, item: OpaqueIterationItem): ListItemOpcode {
  return vm.enterItem(item);
}

export function exitList(vm: VM): void {
  vm.exit();
  vm.listStack.pop();
}

export class AppendingBlockList implements AppendingBlock {
  constructor(
    private readonly parent: SimpleElement,
    public boundList: Bounds[]
  ) {
    this.parent = parent;
    this.boundList = boundList;
  }

  parentElement() {
    return this.parent;
  }

  firstNode(): SimpleNode {
    let head = expect(
      this.boundList[0],
      'cannot call `firstNode()` while `AppendingBlockList` is still initializing'
    );

    return head.firstNode();
  }

  lastNode(): SimpleNode {
    let boundList = this.boundList;

    let tail = expect(
      boundList[boundList.length - 1],
      'cannot call `lastNode()` while `AppendingBlockList` is still initializing'
    );

    return tail.lastNode();
  }

  openElement(_element: SimpleElement) {
    assert(false, 'Cannot openElement directly inside a block list');
  }

  closeElement() {
    assert(false, 'Cannot closeElement directly inside a block list');
  }

  didAppendNode(_node: SimpleNode) {
    assert(false, 'Cannot create a new node directly inside a block list');
  }

  didAppendBounds(_bounds: Bounds) {}

  finalize(_stack: TreeBuilder) {
    assert(this.boundList.length > 0, 'boundsList cannot be empty');
  }
}
