import type { Bounds } from '../dom/bounds.js';
import type { RenderAdapter } from '../render-adapter.js';
import type { Environment } from './environment.js';
import type { ExceptionHandler } from './render.js';

export interface UpdatingVM {
  env: Environment;
  adapter: RenderAdapter;
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
