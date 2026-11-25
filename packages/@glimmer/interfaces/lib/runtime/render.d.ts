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
  /**
   * The root destroyable of the render.
   * It exists before the render runs, so a caller can own it
   * even when the render throws and makes no render result.
   */
  readonly drop: object;

  next(): RichIteratorResult<null, RenderResult>;
  sync(): RenderResult;
}
