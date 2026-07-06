import type {
  Nullable,
  RenderScopeNode,
  RenderScopeStack,
  UpdatingOpcode,
  UpdatingVM,
} from '@glimmer/interfaces';

/**
 * Tracks the render scope tree: one node per component with the `renderScope`
 * capability, linked to the nearest enclosing node. A component provides
 * values (e.g. Ember's `outletState` and `view`) on its own node, and
 * descendants read the nearest provided value by walking up the parent chain.
 *
 * During initial render, `push` creates nodes as the append VM encounters
 * components. During updates, `EnterRenderScopeOpcode`/`ExitRenderScopeOpcode`
 * re-establish existing nodes as the updating VM descends, so any content
 * (re-)rendered mid-update — e.g. a `TryOpcode` re-rendering after a state
 * change — sees the same scope it would have on initial render.
 */
export class RenderScopeStackImpl implements RenderScopeStack {
  private stack: RenderScopeNode[] = [];

  get current(): Nullable<RenderScopeNode> {
    return this.stack.length === 0 ? null : (this.stack[this.stack.length - 1] as RenderScopeNode);
  }

  // Drop any nodes left behind by a render that errored mid-flight.
  begin(): void {
    this.stack.length = 0;
  }

  push(): RenderScopeNode {
    let node: RenderScopeNode = { parent: this.current, values: null };
    this.stack.push(node);
    return node;
  }

  enter(node: RenderScopeNode): void {
    this.stack.push(node);
  }

  exit(): void {
    this.stack.pop();
  }
}

/**
 * Provide `value` for `key` at the current render scope node — visible to the
 * providing component's subtree. May only be called while that component is
 * rendering (in practice: from a component manager's `create`).
 */
export function provideRenderScopeValue(
  scope: RenderScopeStack,
  key: PropertyKey,
  value: unknown
): void {
  let node = scope.current;

  if (node === null) {
    throw new Error(
      'Attempted to provide a render scope value outside of rendering a component with the `renderScope` capability'
    );
  }

  (node.values ??= new Map()).set(key, value);
}

/**
 * Read the nearest provided value for `key`, starting at `node` and walking up
 * the render scope tree. Returns `undefined` if no ancestor provides `key`.
 */
export function readRenderScopeValue(node: Nullable<RenderScopeNode>, key: PropertyKey): unknown {
  for (let current = node; current !== null; current = current.parent) {
    if (current.values?.has(key)) {
      return current.values.get(key);
    }
  }

  return undefined;
}

export class EnterRenderScopeOpcode implements UpdatingOpcode {
  constructor(
    private node: RenderScopeNode,
    private scope: RenderScopeStack
  ) {}

  evaluate(_vm: UpdatingVM) {
    this.scope.enter(this.node);
  }
}

export class ExitRenderScopeOpcode implements UpdatingOpcode {
  constructor(private scope: RenderScopeStack) {}

  evaluate(_vm: UpdatingVM) {
    this.scope.exit();
  }
}
