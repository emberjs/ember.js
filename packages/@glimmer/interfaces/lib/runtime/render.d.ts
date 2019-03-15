import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { SymbolDestroyable, RichIteratorResult } from '../core';
import { Bounds } from '../dom/bounds';
import { Environment } from './environment';

export interface ExceptionHandler {
  handleException(): void;
}

export interface RenderResult extends Bounds, SymbolDestroyable, ExceptionHandler {
  readonly env: Environment;
  readonly drop: object;

  rerender(options?: { alwaysRevalidate: false }): void;

  parentElement(): SimpleElement;

  firstNode(): SimpleNode;
  lastNode(): SimpleNode;

  // compat, as this is a user-exposed API
  destroy(): void;
}

export interface TemplateIterator {
  next(): RichIteratorResult<null, RenderResult>;
  sync(): RenderResult;
}
