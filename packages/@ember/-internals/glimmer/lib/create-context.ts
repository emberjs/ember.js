/**
@module @ember/helper
*/
import type { TemplateOnlyComponent } from '@ember/component/template-only';
import { precompileTemplate } from '@ember/template-compilation';
import type {
  InternalComponentCapabilities,
  InternalComponentManager,
  VMArguments,
  WithCreateInstance,
} from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import type { Reference } from '@glimmer/reference/lib/reference';
import { NULL_REFERENCE, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference/lib/reference';
import { currentDynamicScope } from '@glimmer/runtime/lib/scope';
import type { DynamicScope } from './dynamic-scope';

export interface Context<T> {
  Provide: TemplateOnlyComponent<{
    Args: { value: T };
    Blocks: { default: [] };
  }>;

  readonly value: T;
}

const PROVIDE_TEMPLATE = precompileTemplate('{{yield}}', { strictMode: true });

class ProvideDefinition {
  /**
   * @param key the variable of the context in the dynamic scope
   */
  constructor(readonly key: object) {}

  toString(): string {
    return 'Provide';
  }
}

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  /**
   * The VM gives `Provide` a child dynamic scope for its block.
   */
  dynamicScope: true,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

class ProvideManager
  implements
    InternalComponentManager<ProvideDefinition, ProvideDefinition>,
    WithCreateInstance<ProvideDefinition, ProvideDefinition>
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    _owner: object,
    definition: ProvideDefinition,
    args: VMArguments,
    _env: unknown,
    dynamicScope: DynamicScope
  ): ProvideDefinition {
    /**
     * Without `@value`, the provider still exists and provides `undefined`.
     */
    let value: Reference = args.named.capture()['value'] ?? UNDEFINED_REFERENCE;

    dynamicScope.set(definition.key, value);

    return definition;
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
  }

  getDebugName(): string {
    return 'Provide';
  }

  getDestroyable(): null {
    return null;
  }

  didCreate() {}
  didUpdate() {}
  didRenderLayout() {}
  didUpdateLayout() {}
}

setInternalComponentManager(new ProvideManager(), ProvideDefinition.prototype);
setComponentTemplate(PROVIDE_TEMPLATE, ProvideDefinition.prototype);

export function createContext<T>(): Context<T> {
  /**
   * The identity of this context.
   *
   * Two contexts never match each other, even with the same `T`.
   */
  const key = {};

  return {
    Provide: new ProvideDefinition(key) as unknown as Context<T>['Provide'],

    get value(): T {
      let scope = currentDynamicScope() as DynamicScope | null | undefined;

      if (scope === undefined) {
        throw new Error(
          'A context `value` was read outside of rendering. Read the context while rendering, for example in a component constructor, and keep the value.'
        );
      }

      if (scope === null || !scope.has(key)) {
        throw new Error(
          'No matching `<Provide>` was found in the render tree. Wrap consumers in `<context.Provide @value={{...}}>...</context.Provide>`, or provide a value at the application root.'
        );
      }

      return valueForRef(scope.get(key)) as T;
    },
  };
}
