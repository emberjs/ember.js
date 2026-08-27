import type { Reference } from '@glimmer/interfaces';
import type { OpaqueIterationItem, OpaqueIterator } from '@glimmer/reference/lib/iterable';
import { expect } from '@glimmer/debug-util/lib/platform-utils';

import type { VM } from './append';
import type { AppendingBlockList } from './element-builder';

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
  let list = vm.tree().pushBlockList(updating) as AppendingBlockList;

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
