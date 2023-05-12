import type { Reference } from '../references';
import type { CapturedArguments } from './arguments';
import type { Owner } from './owner';
import type { DynamicScope } from './scope';

export type HelperDefinitionState = object;

export interface Helper<O extends Owner = Owner> {
  (args: CapturedArguments, owner: O | undefined, dynamicScope?: DynamicScope): Reference;
}
