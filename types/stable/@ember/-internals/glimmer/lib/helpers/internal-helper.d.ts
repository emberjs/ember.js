declare module '@ember/-internals/glimmer/lib/helpers/internal-helper' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { Helper, HelperDefinitionState } from '@glimmer/interfaces';
  export function internalHelper(helper: Helper<InternalOwner>): HelperDefinitionState;
}
