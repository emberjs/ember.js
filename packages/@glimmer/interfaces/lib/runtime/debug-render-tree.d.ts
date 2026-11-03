import type { SimpleElement, SimpleNode } from '@simple-dom/interface';

import type { Nullable } from '../core.js';
import type { Bounds } from '../dom/bounds.js';
import type { Revision } from '../tags.js';
import type { Arguments, CapturedArguments } from './arguments.js';

export type RenderNodeType =
  | 'outlet'
  | 'engine'
  | 'route-template'
  | 'component'
  | 'modifier'
  | 'keyword'
  | 'helper';

export interface RenderNode {
  type: RenderNodeType;
  name: string;
  args: CapturedArguments;
  instance: unknown;
}

/**
 * Reactivity introspection for a single argument of a render node: the
 * revision of its most recently computed value, and whether that value
 * was invalidated since the node's previous render (i.e. whether this
 * argument caused the node's most recent re-render).
 */
export interface CapturedRenderNodeArgReactivity {
  debugLabel: string | undefined;
  revision: Revision;
  changed: boolean;
}

/**
 * Reactivity introspection for a render node, so debug tooling (e.g. the
 * Ember Inspector) can answer "how often did this re-render, and what
 * caused the most recent re-render?" without patching the VM.
 */
export interface CapturedRenderNodeReactivity {
  /** Number of times the node re-rendered after its initial render. */
  updateCount: number;
  /** The global revision when the node last (re-)rendered. */
  revision: Revision;
  /** The global revision of the render before that, if it re-rendered. */
  previousRevision: Nullable<Revision>;
  args: {
    positional: CapturedRenderNodeArgReactivity[];
    named: Record<string, CapturedRenderNodeArgReactivity>;
  };
}

export interface CapturedRenderNode {
  id: string;
  type: RenderNodeType;
  name: string;
  args: Arguments;
  instance: unknown;
  bounds: null | {
    parentElement: SimpleElement;
    firstNode: SimpleNode;
    lastNode: SimpleNode;
  };
  reactivity: CapturedRenderNodeReactivity;
  children: CapturedRenderNode[];
}

export interface DebugRenderTree<Bucket extends object = object> {
  begin(): void;

  create(state: Bucket, node: RenderNode): void;

  update(state: Bucket): void;

  didRender(state: Bucket, bounds: Nullable<Bounds>): void;

  willDestroy(state: Bucket): void;

  commit(): void;

  capture(): CapturedRenderNode[];
}
