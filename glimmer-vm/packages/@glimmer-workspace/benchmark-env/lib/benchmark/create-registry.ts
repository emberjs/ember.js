import type {
  ClassicResolver,
  Dict,
  Helper,
  HelperDefinitionState,
  InternalModifierManager,
  ModifierDefinitionState,
  ResolvedComponentDefinition,
  SimpleDocument,
  SimpleElement,
} from '@glimmer/interfaces';
import {
  getComponentTemplate,
  getInternalComponentManager,
  setInternalHelperManager,
  setInternalModifierManager,
} from '@glimmer/manager';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler';
import { artifacts, RuntimeOpImpl } from '@glimmer/program';
import { runtimeOptions } from '@glimmer/runtime';

import type { UpdateBenchmark } from '../interfaces';

import createEnvDelegate from './create-env-delegate';
import renderBenchmark from './render-benchmark';

export interface Registry {
  /**
   * Register a component with a manager
   * @param name
   * @param component
   * @param manager
   */
  registerComponent<T extends object>(name: string, component: T): void;
  /**
   * Register a helper
   * @param name
   * @param helper
   */
  registerHelper(name: string, helper: Helper): void;
  /**
   * Register a modifier
   * @param name
   * @param helper
   */
  registerModifier<T extends object>(
    name: string,
    modifier: T,
    manager: InternalModifierManager<unknown, T>
  ): void;

  render(
    entry: string,
    args: Dict,
    element: SimpleElement | HTMLElement,
    isInteractive?: boolean
  ): Promise<UpdateBenchmark>;
}

export default function createRegistry(): Registry {
  const components = new Map<string, ResolvedComponentDefinition>();
  const helpers = new Map<string, HelperDefinitionState>();
  const modifiers = new Map<string, ModifierDefinitionState>();

  return {
    registerComponent: (name: string, component: object) => {
      let manager = getInternalComponentManager(component);

      components.set(name, {
        state: component,
        manager,
        template: getComponentTemplate(component)!({}),
      });
    },
    registerHelper: (name, helper) => {
      let definition = {};
      setInternalHelperManager(helper, definition);
      helpers.set(name, definition);
    },
    registerModifier: (name, modifier, manager) => {
      setInternalModifierManager(manager, modifier);
      modifiers.set(name, modifier);
    },
    render: (entry, args, element, isInteractive) => {
      const sharedArtifacts = artifacts();
      const document = element.ownerDocument as SimpleDocument;
      const envDelegate = createEnvDelegate(isInteractive ?? true);

      const resolver = {
        lookupHelper: (name) => helpers.get(name) ?? null,
        lookupModifier: (name) => modifiers.get(name) ?? null,
        lookupComponent: (name) => components.get(name) ?? null,

        lookupBuiltInHelper: () => null,
        lookupBuiltInModifier: () => null,
      } satisfies ClassicResolver;

      const runtime = runtimeOptions({ document }, envDelegate, sharedArtifacts, resolver);

      const context = new EvaluationContextImpl(
        sharedArtifacts,
        (heap) => new RuntimeOpImpl(heap),
        runtime
      );
      const component = components.get(entry);
      if (!component) {
        throw new Error(`missing ${entry} component`);
      }

      return renderBenchmark(sharedArtifacts, context, component, args, element as SimpleElement);
    },
  };
}
