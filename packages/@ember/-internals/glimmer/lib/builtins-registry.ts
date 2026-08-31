import type { InternalOwner } from '@ember/-internals/owner';
import type {
  ClassicResolver,
  HelperDefinitionState,
  ModifierDefinitionState,
  Nullable,
  ResolvedComponentDefinition,
} from '@glimmer/interfaces';

/**
 * The helpers and modifiers a template can reach by name. Empty until
 * `ensureBuiltins()` in `./builtins` fills it. Only code paths that
 * resolve by name (loose mode templates, JSON blocks, the classic
 * renderer) call that, so a strict app never loads the helpers behind it.
 */
export const BUILTIN_HELPERS: Record<string, object> = {};
export const BUILTIN_MODIFIERS: Record<string, object> = {};

export type { HelperDefinitionState };

let resolver: ClassicResolver<InternalOwner> | null = null;

export function registerResolver(impl: ClassicResolver<InternalOwner>): void {
  resolver = impl;
}

/**
 * The resolver the strict render path starts with. Every lookup returns
 * `null` until `ensureBuiltins()` registers the real one, so an app that
 * loads no loose mode template does not carry `ResolverImpl`.
 */
export class LazyResolver implements ClassicResolver<InternalOwner> {
  lookupPartial(): null {
    return null;
  }

  lookupHelper(name: string, owner: InternalOwner): Nullable<HelperDefinitionState> {
    return resolver?.lookupHelper?.(name, owner) ?? null;
  }

  lookupModifier(name: string, owner: InternalOwner): Nullable<ModifierDefinitionState> {
    return resolver?.lookupModifier?.(name, owner) ?? null;
  }

  lookupComponent(name: string, owner: InternalOwner): Nullable<ResolvedComponentDefinition> {
    return resolver?.lookupComponent?.(name, owner) ?? null;
  }
}
