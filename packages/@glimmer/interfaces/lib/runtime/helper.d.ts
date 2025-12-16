import type { Reference } from '../references.js';
import type { CapturedArguments } from './arguments.js';
import type { Owner } from './owner.js';
import type { DynamicScope } from './scope.js';

export type HelperDefinitionState = object;

export interface Helper<O extends Owner = Owner> {
  (args: CapturedArguments, owner: O | undefined, dynamicScope?: DynamicScope): Reference;
}
