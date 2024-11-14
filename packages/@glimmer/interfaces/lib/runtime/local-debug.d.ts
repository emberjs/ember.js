import type { Nullable } from '../core.js';
import type { BlockMetadata } from '../template.js';

type Handle = number;

export interface DebugTemplates {
  readonly active: Nullable<BlockMetadata>;
  register(handle: Handle, metadata: BlockMetadata): void;
  willCall(handle: Handle): void;
  return(): void;
}
