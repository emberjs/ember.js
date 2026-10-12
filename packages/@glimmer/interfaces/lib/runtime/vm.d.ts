import type { Bounds } from '../dom/bounds.js';
import type { DOMRenderer } from '../dom/renderer.js';
import type { Environment } from './environment.js';
import type { ExceptionHandler } from './render.js';

export interface UpdatingVM {
  env: Environment;
  dom: DOMRenderer;
  alwaysRevalidate: boolean;

  execute(opcodes: UpdatingOpcode[], handler: ExceptionHandler): void;
  goto(index: number): void;
  try(ops: UpdatingOpcode[], handler: ExceptionHandler | null): void;
  throw(): void;
}

export interface UpdatingOpcode {
  evaluate(vm: UpdatingVM): void;
}

export interface UpdatingBlockOpcode extends UpdatingOpcode, Bounds {}
