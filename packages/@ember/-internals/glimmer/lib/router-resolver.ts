import type { HelperDefinitionState } from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import type { Nullable } from '@ember/-internals/utility-types';
import ResolverImpl from './resolver';
import { mountHelper } from './syntax/mount';
import { outletHelper } from './syntax/outlet';

const ROUTER_KEYWORD_HELPERS: Record<string, object> = {
  '-mount': mountHelper,
  '-outlet': outletHelper,
};

/**
 * The resolver used by the classic application `Renderer`. It extends the
 * shared `ResolverImpl` with the keywords that require the router and engine
 * infrastructure (`{{outlet}}` and `{{mount}}`). Keeping these out of the
 * base resolver means renderers that have no router (e.g. `renderComponent`)
 * do not pull the outlet/engine machinery into the build.
 */
export default class RouterResolver extends ResolverImpl {
  // Loose-mode templates resolve the wrapped `{{outlet}}` / `{{mount}}`
  // keywords (`{{component (-outlet)}}`) by name. Strict templates bind the
  // helpers as imports and never reach the resolver.
  override lookupHelper(name: string, owner: InternalOwner): Nullable<HelperDefinitionState> {
    return ROUTER_KEYWORD_HELPERS[name] ?? super.lookupHelper(name, owner);
  }
}
