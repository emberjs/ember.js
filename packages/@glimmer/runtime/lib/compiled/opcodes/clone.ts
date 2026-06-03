import type {
  Environment,
  Reference,
  SimpleElement,
  SimpleNode,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import {
  VM_CLONE_BIND_ATTRS_OP,
  VM_CLONE_ENTER_SLOT_OP,
  VM_CLONE_EXIT_SLOT_OP,
  VM_CLONE_GUARD_OP,
  VM_CLONE_TEMPLATE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import { isConstRef, valueForRef } from '@glimmer/reference/lib/reference';

import type { DynamicAttribute } from '../../vm/attributes/dynamic';
import type { NewTreeBuilder } from '../../vm/element-builder';

import { APPEND_OPCODES } from '../../opcodes';
import { dynamicAttribute } from '../../vm/attributes/dynamic';

/**
 * SPIKE: clone-based rendering.
 *
 * A clonable block compiles to `CLONE_GUARD` (jump to the normal opcodes when
 * the builder can't clone), `CLONE_TEMPLATE` (clone the static skeleton), then:
 *   - dynamic attributes: `expr` each value + one `CLONE_BIND_ATTRS` that binds
 *     them all to their clone nodes and registers a single composite updater.
 *   - dynamic content: `CLONE_ENTER_SLOT` + the normal content opcodes (so
 *     content-type dispatch and updates stay correct) + `CLONE_EXIT_SLOT`.
 */

interface AttrDesc {
  p: string; // path, e.g. "1.0"
  n: string; // attr name
  t?: boolean; // trusting
}

const META_CACHE = new Map<string, AttrDesc[]>();
const PATH_CACHE = new Map<string, number[]>();

function metaFor(json: string): AttrDesc[] {
  let meta = META_CACHE.get(json);
  if (meta === undefined) {
    meta = JSON.parse(json) as AttrDesc[];
    META_CACHE.set(json, meta);
  }
  return meta;
}

function navigate(root: SimpleNode, path: string): SimpleNode {
  if (path === '') return root;
  let indices = PATH_CACHE.get(path);
  if (indices === undefined) {
    indices = path.split('.').map(Number);
    PATH_CACHE.set(path, indices);
  }
  let node = root;
  for (const index of indices) node = node.childNodes[index] as SimpleNode;
  return node;
}

class CloneAttrsUpdater implements UpdatingOpcode {
  constructor(
    private refs: Reference[],
    private attrs: DynamicAttribute[],
    private env: Environment
  ) {}

  evaluate(): void {
    const { refs, attrs, env } = this;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      const ref = refs[i];
      if (attr && ref) attr.update(valueForRef(ref), env);
    }
  }
}

// If the current builder can't clone (serialization, rehydration), jump past
// the clone path to the normal node-by-node opcodes emitted as the else branch.
APPEND_OPCODES.add(VM_CLONE_GUARD_OP as never, (vm, { op1: target }) => {
  if (!(vm.tree() as NewTreeBuilder).canCloneInto()) {
    vm.lowlevel.goto(target);
  }
});

APPEND_OPCODES.add(VM_CLONE_TEMPLATE_OP as never, (vm, { op1 }) => {
  const html = vm.constants.getValue<string>(op1);
  (vm.tree() as NewTreeBuilder).pushClonedTemplate(html);
});

APPEND_OPCODES.add(VM_CLONE_BIND_ATTRS_OP as never, (vm, { op1 }) => {
  const descriptors = metaFor(vm.constants.getValue<string>(op1));
  const count = descriptors.length;

  // References were pushed in attr order; pop into matching slots.
  const refs = new Array<Reference>(count);
  for (let i = count - 1; i >= 0; i--) refs[i] = vm.stack.pop();

  const builder = vm.tree() as NewTreeBuilder;
  const root = builder.cloneRoot as SimpleNode;
  const env = vm.env;

  const liveRefs: Reference[] = [];
  const liveAttrs: DynamicAttribute[] = [];

  for (let i = 0; i < count; i++) {
    const desc = descriptors[i];
    const ref = refs[i];
    if (!desc || !ref) continue;
    const element = navigate(root, desc.p) as SimpleElement;
    const attr = dynamicAttribute(element, desc.n, null, desc.t);
    // `set` writes via the builder's `constructing`; point it at our node.
    const prev = builder.constructing;
    builder.constructing = element;
    attr.set(builder, valueForRef(ref), env);
    builder.constructing = prev;
    if (!isConstRef(ref)) {
      liveRefs.push(ref);
      liveAttrs.push(attr);
    }
  }

  if (liveAttrs.length > 0) vm.updateWith(new CloneAttrsUpdater(liveRefs, liveAttrs, env));
});

APPEND_OPCODES.add(VM_CLONE_ENTER_SLOT_OP as never, (vm, { op1 }) => {
  const path = vm.constants.getValue<string>(op1);
  (vm.tree() as NewTreeBuilder).cloneEnterSlot(path);
});

APPEND_OPCODES.add(VM_CLONE_EXIT_SLOT_OP as never, (vm) => {
  (vm.tree() as NewTreeBuilder).cloneExitSlot();
});
