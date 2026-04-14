/**
 * Debug Render Tree Implementation for GXT
 *
 * This module provides a shim for Ember's debug render tree API,
 * allowing Ember Inspector and debug tools to work with GXT.
 */

export type RenderNodeType = 'outlet' | 'engine' | 'route-template' | 'component' | 'modifier' | 'keyword';

export interface RenderNode {
  type: RenderNodeType;
  name: string;
  args: CapturedArguments;
  instance: unknown;
  template?: string;
}

export interface CapturedArguments {
  positional: unknown[];
  named: Record<string, unknown>;
}

export interface Bounds {
  parentElement: Element;
  firstNode: Node;
  lastNode: Node;
}

export interface CapturedRenderNode {
  id: string;
  type: RenderNodeType;
  name: string;
  args: { positional: unknown[]; named: Record<string, unknown> };
  instance: unknown;
  template: string | null;
  bounds: Bounds | null;
  children: CapturedRenderNode[];
}

interface RenderNodeData {
  node: RenderNode;
  bounds: Bounds | null;
  children: object[];
  parent: object | null;
}

let nodeIdCounter = 0;

/**
 * DebugRenderTree tracks the render tree for debugging purposes.
 * This is used by Ember Inspector to display the component hierarchy.
 */
export class DebugRenderTree {
  private stack: object[] = [];
  private nodes: Map<object, RenderNodeData> = new Map();
  private roots: Set<object> = new Set();
  private nodeIds: Map<object, string> = new Map();
  private inTransaction = false;

  /**
   * Start a render transaction.
   * Called at the beginning of a render cycle.
   */
  begin(): void {
    this.inTransaction = true;
    this.stack = [];
  }

  /**
   * Register a new render node (component, modifier, or keyword).
   * @param bucket - Stable object used as key for this node
   * @param node - The render node data
   */
  create(bucket: object, node: RenderNode): void {
    // Generate unique ID for this node
    if (!this.nodeIds.has(bucket)) {
      this.nodeIds.set(bucket, `render-node-${++nodeIdCounter}`);
    }

    const data: RenderNodeData = {
      node,
      bounds: null,
      children: [],
      parent: this.stack.length > 0 ? this.stack[this.stack.length - 1] : null,
    };

    this.nodes.set(bucket, data);

    // Add to parent's children or to roots
    if (data.parent) {
      const parentData = this.nodes.get(data.parent);
      if (parentData && !parentData.children.includes(bucket)) {
        parentData.children.push(bucket);
      }
    } else {
      this.roots.add(bucket);
    }

    // Push onto stack for child tracking
    this.stack.push(bucket);
  }

  /**
   * Record the DOM bounds after a node has rendered.
   * @param bucket - The bucket for this node
   * @param bounds - The DOM bounds (parent element, first/last nodes)
   */
  didRender(bucket: object, bounds: Bounds): void {
    const data = this.nodes.get(bucket);
    if (data) {
      data.bounds = bounds;
    }

    // Pop from stack
    const idx = this.stack.indexOf(bucket);
    if (idx !== -1) {
      this.stack.splice(idx, 1);
    }
  }

  /**
   * Mark a node as needing update during rerender.
   * @param bucket - The bucket for this node
   */
  update(bucket: object): void {
    // For now, just ensure the node exists
    // In a full implementation, this would mark the node for update tracking
  }

  /**
   * Clean up a node that's being destroyed.
   * @param bucket - The bucket for this node
   */
  willDestroy(bucket: object): void {
    const data = this.nodes.get(bucket);
    if (data) {
      // Remove from parent's children
      if (data.parent) {
        const parentData = this.nodes.get(data.parent);
        if (parentData) {
          const idx = parentData.children.indexOf(bucket);
          if (idx !== -1) {
            parentData.children.splice(idx, 1);
          }
        }
      }

      // Remove from roots
      this.roots.delete(bucket);

      // Clean up children recursively
      for (const child of data.children) {
        this.willDestroy(child);
      }

      // Remove the node
      this.nodes.delete(bucket);
      this.nodeIds.delete(bucket);
    }
  }

  /**
   * Finalize the render transaction.
   */
  commit(): void {
    this.inTransaction = false;
    this.stack = [];
  }

  /**
   * Capture the current render tree for debugging.
   * This is called by Ember Inspector to get a serializable tree.
   * @returns Array of captured render nodes at the root level
   */
  capture(): CapturedRenderNode[] {
    const result: CapturedRenderNode[] = [];

    for (const root of this.roots) {
      const captured = this.captureNode(root);
      if (captured) {
        result.push(captured);
      }
    }

    return result;
  }

  /**
   * Recursively capture a single node and its children.
   */
  private captureNode(bucket: object): CapturedRenderNode | null {
    const data = this.nodes.get(bucket);
    if (!data) return null;

    const id = this.nodeIds.get(bucket) || `render-node-${++nodeIdCounter}`;

    const children: CapturedRenderNode[] = [];
    for (const child of data.children) {
      const captured = this.captureNode(child);
      if (captured) {
        children.push(captured);
      }
    }

    return {
      id,
      type: data.node.type,
      name: data.node.name,
      args: {
        positional: data.node.args?.positional ?? [],
        named: data.node.args?.named ?? {},
      },
      instance: data.node.instance,
      template: data.node.template ?? null,
      bounds: data.bounds,
      children,
    };
  }

  /**
   * Get node count (for debugging)
   */
  get size(): number {
    return this.nodes.size;
  }

  /**
   * Clear all nodes (for testing)
   */
  clear(): void {
    this.nodes.clear();
    this.roots.clear();
    this.nodeIds.clear();
    this.stack = [];
    this.inTransaction = false;
  }
}

// Global debug render tree instance
let globalDebugRenderTree: DebugRenderTree | null = null;

/**
 * Get or create the global debug render tree instance.
 */
export function getDebugRenderTree(): DebugRenderTree {
  if (!globalDebugRenderTree) {
    globalDebugRenderTree = new DebugRenderTree();
    (globalThis as any).__EMBER_DEBUG_RENDER_TREE__ = globalDebugRenderTree;
  }
  return globalDebugRenderTree;
}

/**
 * Capture the render tree from an application.
 * This is the public API that Ember Inspector calls.
 */
export function captureRenderTree(app?: any): CapturedRenderNode[] {
  const tree = getDebugRenderTree();
  return tree.capture();
}

// Re-export types that Ember expects
export const EMPTY_ARGS: CapturedArguments = {
  positional: [],
  named: {},
};
