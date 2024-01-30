import type { Helper, HelperDefinitionState, Owner } from '../../runtime.js';
import type { HelperManager } from '../helper.js';

export interface InternalHelperManager<TOwner extends Owner> {
  getDelegateFor(owner: TOwner | undefined): HelperManager<unknown>;

  getHelper(definition: HelperDefinitionState): Helper;
}
