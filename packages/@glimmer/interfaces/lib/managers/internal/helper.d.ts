import { Helper, Owner } from '../../runtime';
import { HelperManager } from '../helper';

export interface InternalHelperManager<TOwner extends Owner> {
  getDelegateFor(owner: TOwner | undefined): HelperManager<unknown>;

  helper: Helper;
}
