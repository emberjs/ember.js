import type {
  InternalComponentManager,
  Nullable,
  ResolvedComponentDefinition,
} from '@glimmer/interfaces';
import { BUILTIN_HELPERS, BUILTIN_KEYWORD_HELPERS } from '../resolver';

///////////

/**
 * Resolution for non built ins is now handled by the vm as we are using strict mode
 */
export class StrictResolver {
  lookupHelper(name: string, _owner: object): Nullable<object> {
    return BUILTIN_HELPERS[name] ?? null;
  }

  lookupBuiltInHelper(name: string): Nullable<object> {
    return BUILTIN_KEYWORD_HELPERS[name] ?? null;
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

  lookupBuiltInModifier(_name: string): Nullable<object> {
    return null;
  }
}
