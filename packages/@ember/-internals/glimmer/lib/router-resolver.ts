import type { HelperDefinitionState } from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import type { Nullable } from '@ember/-internals/utility-types';
import ResolverImpl from './resolver';
import { mountHelper } from './syntax/mount';
const ROUTER_KEYWORD_HELPERS: Record<string, object> = {
  '-mount': mountHelper,
};

/**
 * The resolver used by the classic application `Renderer`. It extends the
 * shared `ResolverImpl` with the keywords that require the router and engine
 * infrastructure (`{{outlet}}` and `{{mount}}`). Keeping these out of the
 * base resolver means renderers that have no router (e.g. `renderComponent`)
 * do not pull the outlet/engine machinery into the build.
 */
export default class RouterResolver extends ResolverImpl {
  override lookupBuiltInHelper(name: string): Nullable<HelperDefinitionState> {
    return ROUTER_KEYWORD_HELPERS[name] ?? super.lookupBuiltInHelper(name);
  }

  // Loose-mode templates resolve the wrapped `{{outlet}}` / `{{mount}}`
  // keywords (`{{component (-outlet)}}`) through `lookupHelper`, not
  // `lookupBuiltInHelper`, so the router keywords have to be added to both
  // lookup paths.
  override lookupHelper(name: string, owner: InternalOwner): Nullable<HelperDefinitionState> {
    return ROUTER_KEYWORD_HELPERS[name] ?? super.lookupHelper(name, owner);
  }
}
