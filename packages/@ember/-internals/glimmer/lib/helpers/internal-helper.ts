import EngineInstance from '@ember/engine/instance';
import { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { setInternalHelperManager } from '@glimmer/manager';

export function internalHelper(helper: Helper<EngineInstance>): HelperDefinitionState {
  return setInternalHelperManager(helper, {});
}
