import {
  VM_CLONE_NAVIGATE_ELEMENT_OP,
  VM_CLONE_NAVIGATE_INTO_OP,
  VM_CLONE_POP_OP,
  VM_CLONE_TEMPLATE_OP,
} from '@glimmer/constants/lib/syscall-ops';

import { APPEND_OPCODES } from '../../opcodes';

/**
 * SPIKE: clone-based rendering opcodes.
 *
 * A clonable block compiles to `CLONE_TEMPLATE` followed, for each dynamic part,
 * by a navigate op + the part's normal opcodes. The static skeleton is parsed
 * once per unique HTML and `cloneNode(true)`d per instance — replacing the
 * node-by-node element-building opcodes.
 */

const TEMPLATE_CACHE = new Map<string, Node>();

function templateFor(html: string): Node {
  let node = TEMPLATE_CACHE.get(html);
  if (node === undefined) {
    // eslint-disable-next-line no-undef
    const el = document.createElement('template');
    el.innerHTML = html;
    // The whole fragment (the analyzer guarantees exactly one element child,
    // possibly with surrounding whitespace text).
    node = el.content;
    TEMPLATE_CACHE.set(html, node);
  }
  return node;
}

APPEND_OPCODES.add(VM_CLONE_TEMPLATE_OP as never, (vm, { op1 }) => {
  const html = vm.constants.getValue<string>(op1);
  const clone = templateFor(html).cloneNode(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vm.tree() as any).pushClonedRoot(clone);
});

APPEND_OPCODES.add(VM_CLONE_NAVIGATE_ELEMENT_OP as never, (vm, { op1 }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vm.tree() as any).cloneNavigateElement(vm.constants.getValue<string>(op1));
});

APPEND_OPCODES.add(VM_CLONE_NAVIGATE_INTO_OP as never, (vm, { op1 }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vm.tree() as any).cloneNavigateInto(vm.constants.getValue<string>(op1));
});

APPEND_OPCODES.add(VM_CLONE_POP_OP as never, (vm) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (vm.tree() as any).cloneNavigatePop();
});
