import type {
  CompileTimeResolver as VMCompileTimeResolver,
  InternalComponentManager,
  Nullable,
  ResolvedComponentDefinition,
  RuntimeResolver as VMRuntimeResolver,
} from '@glimmer/interfaces';

///////////

/**
 * Resolution for non built ins is now handled by the vm as we are using strict mode
 */
export class StrictResolver implements VMRuntimeResolver, VMCompileTimeResolver {
  lookupHelper(_name: string, _owner: object): Nullable<object> {
    return null;
  }

  lookupModifier(_name: string, _owner: object): Nullable<object> {
    return null;
  }

  lookupComponent(
    _name: string,
    _owner: object
  ): Nullable<
    ResolvedComponentDefinition<object, unknown, InternalComponentManager<unknown, object>>
  > {
    return null;
  }

  lookupBuiltInHelper(_name: string): Nullable<object> {
    return null;
  }

  lookupBuiltInModifier(_name: string): Nullable<object> {
    return null;
  }
}
