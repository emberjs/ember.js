// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { VMArguments } from './arguments';
import { VM } from './vm';

export type HelperDefinitionState = object;

export interface Helper {
  (args: VMArguments, vm: VM): Reference;
}
