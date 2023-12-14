declare module '@ember/-internals/glimmer/lib/resolver' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type {
    CompileTimeResolver,
    HelperDefinitionState,
    ModifierDefinitionState,
    ResolvedComponentDefinition,
    RuntimeResolver,
  } from '@glimmer/interfaces';
  import type { Nullable } from '@ember/-internals/utility-types';
  const BUILTIN_KEYWORD_MODIFIERS: Record<string, ModifierDefinitionState>;
  export default class ResolverImpl
    implements RuntimeResolver<InternalOwner>, CompileTimeResolver<InternalOwner>
  {
    private componentDefinitionCache;
    lookupPartial(): null;
    lookupHelper(name: string, owner: InternalOwner): Nullable<HelperDefinitionState>;
    lookupBuiltInHelper(name: string): HelperDefinitionState | null;
    lookupModifier(name: string, owner: InternalOwner): Nullable<ModifierDefinitionState>;
    lookupBuiltInModifier<K extends keyof typeof BUILTIN_KEYWORD_MODIFIERS>(
      name: K
    ): (typeof BUILTIN_KEYWORD_MODIFIERS)[K];
    lookupBuiltInModifier(name: string): null;
    lookupComponent(name: string, owner: InternalOwner): ResolvedComponentDefinition | null;
  }
  export {};
}
