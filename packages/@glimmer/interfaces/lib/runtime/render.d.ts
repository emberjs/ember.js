import type { SimpleElement, SimpleNode } from '@simple-dom/interface';

import type { RichIteratorResult } from '../core.js';
import type { Bounds } from '../dom/bounds.js';
import type { Environment } from './environment.js';

export interface ExceptionHandler {
  handleException(): void;
}

export interface RenderResult extends Bounds, ExceptionHandler {
  readonly env: Environment;
  readonly drop: object;

  rerender(options?: { alwaysRevalidate: false }): void;

  parentElement(): SimpleElement;

  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export interface TemplateIterator {
  next(): RichIteratorResult<null, RenderResult>;
  sync(): RenderResult;
}
