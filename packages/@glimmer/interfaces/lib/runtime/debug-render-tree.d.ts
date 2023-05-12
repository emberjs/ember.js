import type { SimpleElement, SimpleNode } from '@simple-dom/interface';

import type { Bounds } from '../dom/bounds';
import type { Arguments, CapturedArguments } from './arguments';

export type RenderNodeType = 'outlet' | 'engine' | 'route-template' | 'component';

export interface RenderNode {
  type: RenderNodeType;
  name: string;
  args: CapturedArguments;
  instance: unknown;
  template?: string | undefined;
}

export interface CapturedRenderNode {
  id: string;
  type: RenderNodeType;
  name: string;
  args: Arguments;
  instance: unknown;
  template: string | null;
  bounds: null | {
    parentElement: SimpleElement;
    firstNode: SimpleNode;
    lastNode: SimpleNode;
  };
  children: CapturedRenderNode[];
}

export interface DebugRenderTree<Bucket extends object = object> {
  begin(): void;

  create(state: Bucket, node: RenderNode): void;

  update(state: Bucket): void;

  didRender(state: Bucket, bounds: Bounds): void;

  willDestroy(state: Bucket): void;

  commit(): void;

  capture(): CapturedRenderNode[];
}
