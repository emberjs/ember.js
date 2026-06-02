import type {
  Environment,
  Reference,
  SimpleElement,
  SimpleNode,
  SimpleText,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import { VM_CLONE_BIND_ALL_OP, VM_CLONE_TEMPLATE_OP } from '@glimmer/constants/lib/syscall-ops';
import { isConstRef, valueForRef } from '@glimmer/reference/lib/reference';

import type { DynamicAttribute } from '../../vm/attributes/dynamic';
import type { NewTreeBuilder } from '../../vm/element-builder';

import { isEmpty } from '../../dom/normalize';
import { APPEND_OPCODES } from '../../opcodes';
import { dynamicAttribute } from '../../vm/attributes/dynamic';

/**
 * SPIKE: clone-based (compiled-bind) rendering.
 *
 * A clonable block compiles to `CLONE_TEMPLATE`, then `expr` for each dynamic
 * part (pushing its value reference), then a single `CLONE_BIND_ALL`. That one
 * op clones nothing extra — it binds every pushed reference to its target node
 * in the freshly cloned skeleton and registers ONE composite updater for the
 * whole row, replacing the per-part navigate + dynamic opcode + updating opcode.
 */

type PartDesc =
  | { k: 'c'; p: string } // content; p = path e.g. "1.0"
  | { k: 'a'; p: string; n: string; t?: boolean }; // attr; n = name, t = trusting

const TEMPLATE_CACHE = new Map<string, Node>();
const META_CACHE = new Map<string, PartDesc[]>();
const PATH_CACHE = new Map<string, number[]>();

function templateFor(html: string): Node {
  let node = TEMPLATE_CACHE.get(html);
  if (node === undefined) {
    const el = document.createElement('template');
    el.innerHTML = html;
    node = el.content; // fragment with exactly one element child (+ maybe text)
    TEMPLATE_CACHE.set(html, node);
  }
  return node;
}

function metaFor(json: string): PartDesc[] {
  let meta = META_CACHE.get(json);
  if (meta === undefined) {
    meta = JSON.parse(json) as PartDesc[];
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

type LivePart =
  | { kind: 'c'; ref: Reference; node: SimpleText; last: string }
  | { kind: 'a'; ref: Reference; attr: DynamicAttribute };

class CloneItemUpdater implements UpdatingOpcode {
  constructor(
    private parts: LivePart[],
    private env: Environment
  ) {}

  evaluate(): void {
    for (const part of this.parts) {
      const value = valueForRef(part.ref);
      if (part.kind === 'c') {
        const str = isEmpty(value) ? '' : String(value);
        if (str !== part.last) part.node.nodeValue = part.last = str;
      } else {
        part.attr.update(value, this.env);
      }
    }
  }
}

APPEND_OPCODES.add(VM_CLONE_TEMPLATE_OP as never, (vm, { op1 }) => {
  const html = vm.constants.getValue<string>(op1);
  const clone = templateFor(html).cloneNode(true) as unknown as SimpleNode;
  (vm.tree() as NewTreeBuilder).pushClonedRoot(clone);
});

APPEND_OPCODES.add(VM_CLONE_BIND_ALL_OP as never, (vm, { op1 }) => {
  const descriptors = metaFor(vm.constants.getValue<string>(op1));
  const count = descriptors.length;

  // References were pushed in part order; pop into matching slots.
  const refs = new Array<Reference>(count);
  for (let i = count - 1; i >= 0; i--) refs[i] = vm.stack.pop();

  const builder = vm.tree() as NewTreeBuilder;
  const root = builder.cloneRoot as SimpleNode;
  const env = vm.env;
  const live: LivePart[] = [];

  for (let i = 0; i < count; i++) {
    const desc = descriptors[i];
    const ref = refs[i];
    if (!desc || !ref) continue;
    const node = navigate(root, desc.p);

    if (desc.k === 'c') {
      const value = valueForRef(ref);
      const str = isEmpty(value) ? '' : String(value);
      const text = node.ownerDocument.createTextNode(str);
      (node as SimpleElement).insertBefore(text, null);
      if (!isConstRef(ref)) live.push({ kind: 'c', ref, node: text, last: str });
    } else {
      const element = node as SimpleElement;
      const attr = dynamicAttribute(element, desc.n, null, desc.t);
      // `set` writes via the builder's `constructing`; point it at our node.
      const prev = builder.constructing;
      builder.constructing = element;
      attr.set(builder, valueForRef(ref), env);
      builder.constructing = prev;
      if (!isConstRef(ref)) live.push({ kind: 'a', ref, attr });
    }
  }

  if (live.length > 0) vm.updateWith(new CloneItemUpdater(live, env));
});
