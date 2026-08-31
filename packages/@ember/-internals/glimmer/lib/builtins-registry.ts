import type { HelperDefinitionState } from '@glimmer/interfaces';

/**
 * Name tables for templates that resolve at runtime: JSON blocks from
 * addons published before importable opcodes, and templates compiled in
 * the browser. `ensureBuiltins()` in `./builtins` fills them, so an app
 * whose templates all bind their imports never loads the helpers behind
 * them.
 */
export const BUILTIN_HELPERS: Record<string, object> = {};
export const BUILTIN_MODIFIERS: Record<string, object> = {};

export type { HelperDefinitionState };

import type {
  ClassicResolver,
  ModifierDefinitionState,
  Nullable,
  ResolvedComponentDefinition,
} from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';

let resolver: ClassicResolver<InternalOwner> | null = null;

export function registerResolver(impl: ClassicResolver<InternalOwner>): void {
  resolver = impl;
}

/**
 * The resolver a renderer starts with when it has no router. It delegates
 * to the classic resolver once a code path that resolves by name loads
 * one, so `renderComponent` can render a loose template without carrying
 * the resolver when no such template exists.
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
