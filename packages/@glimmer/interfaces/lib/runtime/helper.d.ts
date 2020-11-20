// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { HelperManager } from '../managers/helper';
import { VMArguments } from './arguments';
import { VM } from './vm';

export interface Helper {
  (args: VMArguments, vm: VM): Reference;
}

export interface InternalHelperManager {
  helper: Helper;
  manager: HelperManager<unknown> | null;
}
