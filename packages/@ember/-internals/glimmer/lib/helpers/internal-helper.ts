import type { InternalOwner } from '@ember/-internals/owner';
import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
import { internalHelper as glimmerInternalHelper } from '@glimmer/runtime/lib/helpers/internal-helper';

export function internalHelper(helper: Helper<InternalOwner>): HelperDefinitionState {
  // Registering through the VM's own `internalHelper` marks the helper as an
  // implementation detail, keeping it out of debug tooling like the debug
  // render tree (the same treatment `fn`, `hash`, etc. get).
  return glimmerInternalHelper(helper as Helper);
}
