/**
 * The debug render tree of the compat backend: the nodes `captureRenderTree`
 * (`@ember/debug`, Ember Inspector) lists under a `renderComponent` root.
 *
 * Glimmer's `DebugRenderTree` (@glimmer/runtime debug-render-tree.ts) records a
 * node for each component and modifier while the VM renders, under the node of
 * the component whose template rendered it, with its name, arguments, instance
 * and bounds. The compat backend renders templates itself, so it records the
 * same nodes here:
 *
 * - a render whose renderer has the debug render tree (its environment was
 *   created with `ENV._DEBUG_RENDER_TREE`, as Glimmer's) renders with its root
 *   node as the current node (base-renderer.ts `_renderComponentGxt`);
 * - a component's template renders with the component's node as the current
 *   node (manager.ts `renderTemplateWithParentView`), and a modifier is a node
 *   of the component whose template renders its element;
 * - a block that renders after the template it is in (an `{{#if}}` branch, an
 *   `{{#each}}` row, a dynamic component's content, an `{{#in-element}}`)
 *   renders with the node that was current where the block was created;
 * - nothing is recorded while there is no current node: a render without the
 *   debug render tree does no work here.
 *
 * A node leaves the tree when the block it rendered in is destroyed, when its
 * modifier is destroyed, and when its invocation renders again.
 */
import type { CapturedRenderNode } from '@glimmer/interfaces';
import { REFERENCE, valueForRef } from '@glimmer/reference';

/**
 * The arguments of a node, as the component or modifier reads them. They are
 * read when the tree is captured; a value may be a reference.
 */
export interface GxtDebugArgs {
  readonly positional: ArrayLike<unknown>;
  readonly named: object;
}

export interface GxtDebugNode {
  readonly id: number;
  readonly type: CapturedRenderNode['type'];
  readonly name: string;
  readonly args: GxtDebugArgs;
  readonly instance: unknown;
  /** The first and the last DOM node of what the node rendered. */
  first: Node | null;
  last: Node | null;
  parent: GxtDebugNode | null;
  /** In the order they were created. */
  readonly children: Set<GxtDebugNode>;
}

const NO_ARGS: GxtDebugArgs = { positional: [], named: {} };

let current: GxtDebugNode | null = null;
let lastId = 0;

/** The node what renders now is created under, `null` when nothing is recorded. */
export function gxtDebugParent(): GxtDebugNode | null {
  return current;
}

/** Run `render` with `node` as the current node. */
export function gxtWithDebugParent<T>(node: GxtDebugNode | null, render: () => T): T {
  const previous = current;
  current = node;
  try {
    return render();
  } finally {
    current = previous;
  }
}

/** A new node, the last child of `parent` (a root when `parent` is `null`). */
export function gxtCreateDebugNode(
  parent: GxtDebugNode | null,
  type: CapturedRenderNode['type'],
  name: string,
  args: GxtDebugArgs | null,
  instance: unknown
): GxtDebugNode {
  const node: GxtDebugNode = {
    id: ++lastId,
    type,
    name,
    args: args ?? NO_ARGS,
    instance,
    first: null,
    last: null,
    parent,
    children: new Set(),
  };
  parent?.children.add(node);
  return node;
}

/** Remove `node`, and the nodes under it, from the tree. */
export function gxtReleaseDebugNode(node: GxtDebugNode): void {
  node.parent?.children.delete(node);
  node.parent = null;
}

/**
 * Run `render` under `parent` (see `gxtWithDebugParent`); `nodes` are the nodes
 * it created there, which leave the tree with what `render` rendered.
 */
export function gxtRenderDebugContent<T>(
  parent: GxtDebugNode | null,
  render: () => T
): { result: T; nodes: GxtDebugNode[] } {
  if (parent === null) return { result: gxtWithDebugParent(null, render), nodes: [] };
  const before = new Set(parent.children);
  const result = gxtWithDebugParent(parent, render);
  const nodes: GxtDebugNode[] = [];
  for (const node of parent.children) {
    if (!before.has(node)) nodes.push(node);
  }
  return { result, nodes };
}

// ---------------------------------------------------------------- names
// The name a strict-mode template's scope gives a value, as Glimmer (in DEBUG
// builds) names a component or modifier invoked through a lexical variable by
// that variable (`ref.debugLabel`). The first name wins, as Glimmer keeps the
// first `debugName` it gives a definition.
const LEXICAL_NAMES = new WeakMap<object, string>();

/** Record the names of a strict-mode template's scope values. */
export function gxtRecordLexicalNames(scope: Readonly<Record<string, unknown>>): void {
  for (const name of Object.keys(scope)) {
    const value = scope[name];
    if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      !LEXICAL_NAMES.has(value)
    ) {
      LEXICAL_NAMES.set(value, name);
    }
  }
}

/** The lexical name of a definition (see `gxtRecordLexicalNames`). */
export function gxtLexicalName(value: unknown): string | undefined {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
    ? LEXICAL_NAMES.get(value)
    : undefined;
}

// ---------------------------------------------------------------- capture
const ARGUMENT_ERROR = Symbol('ARGUMENT_ERROR');

/**
 * Whether a captured argument is the error reading it threw (Glimmer's
 * `isArgumentError`, the environment's `isArgumentCaptureError`).
 */
export function gxtIsArgumentCaptureError(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as { [ARGUMENT_ERROR]?: boolean })[ARGUMENT_ERROR] === true
  );
}

// The value of one argument, or the error reading it threw, as Glimmer's
// `reifyArgsDebug` captures it: a capture lists the error in the argument's
// place instead of throwing it.
function captureArg(read: () => unknown): unknown {
  try {
    const value = read();
    return value !== null && typeof value === 'object' && REFERENCE in value
      ? valueForRef(value as Parameters<typeof valueForRef>[0])
      : value;
  } catch (error) {
    return { [ARGUMENT_ERROR]: true, error };
  }
}

function captureArgs(args: GxtDebugArgs): CapturedRenderNode['args'] {
  const named: Record<string, unknown> = {};
  const source = args.named as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    // The compat backend's own keys on an args object (`$slots`, `__posCount__`).
    if (key.startsWith('$') || key.startsWith('__')) continue;
    named[key] = captureArg(() => source[key]);
  }
  const positional: unknown[] = [];
  for (let i = 0; i < args.positional.length; i++) {
    positional.push(captureArg(() => args.positional[i]));
  }
  return { positional, named };
}

function captureBounds(node: GxtDebugNode): CapturedRenderNode['bounds'] {
  const { first, last } = node;
  const parentElement = first?.parentNode ?? null;
  if (first === null || last === null || parentElement === null) return null;
  return {
    parentElement,
    firstNode: first,
    lastNode: last,
  } as unknown as CapturedRenderNode['bounds'];
}

/** The captured tree of `nodes`, in order. */
export function gxtCaptureDebugNodes(nodes: Iterable<GxtDebugNode>): CapturedRenderNode[] {
  const captured: CapturedRenderNode[] = [];
  for (const node of nodes) {
    captured.push({
      id: `render-node:${node.id}`,
      type: node.type,
      name: node.name,
      args: captureArgs(node.args),
      instance: node.instance,
      bounds: captureBounds(node),
      children: gxtCaptureDebugNodes(node.children),
    } as CapturedRenderNode);
  }
  return captured;
}
