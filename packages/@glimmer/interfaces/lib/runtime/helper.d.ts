// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { CapturedArguments } from './arguments';
import { Owner } from './owner';
import { DynamicScope } from './scope';

export type HelperDefinitionState = object;

export interface Helper<O extends Owner = Owner> {
  (args: CapturedArguments, owner: O | undefined, dynamicScope?: DynamicScope): Reference;
}
