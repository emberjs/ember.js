import {
  ResolvedComponentDefinition,
  InternalModifierManager,
  Dict,
  ModifierDefinitionState,
  HelperDefinitionState,
  Helper,
} from '@glimmer/interfaces';
import { programCompilationContext } from '@glimmer/opcode-compiler';
import { artifacts } from '@glimmer/program';
import { SimpleElement } from '@simple-dom/interface';
import {
  getComponentTemplate,
  getInternalComponentManager,
  setInternalHelperManager,
  setInternalModifierManager,
} from '@glimmer/manager';

import { UpdateBenchmark } from '../interfaces';
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
    args: Dict<unknown>,
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
      let manager = getInternalComponentManager(undefined, component);

      components.set(name, {
        state: component,
        manager,
        template: getComponentTemplate(component)!({}),
      });
    },
    registerHelper: (name, helper) => {
      let definition = {};
      setInternalHelperManager(() => helper, definition);
      helpers.set(name, definition);
    },
    registerModifier: (name, modifier, manager) => {
      setInternalModifierManager(() => manager, modifier);
      modifiers.set(name, modifier);
    },
    render: (entry, args, element, isIteractive) => {
      const sharedArtifacts = artifacts();
      const context = programCompilationContext(sharedArtifacts, {
        lookupHelper: (name) => helpers.get(name) ?? null,
        lookupModifier: (name) => modifiers.get(name) ?? null,
        lookupComponent: (name) => components.get(name) ?? null,
        lookupPartial: () => null,
      });
      const component = components.get(entry);
      if (!component) {
        throw new Error(`missing ${entry} component`);
      }

      return renderBenchmark(
        sharedArtifacts,
        context,
        {
          lookupComponent: () => null,
          lookupPartial: () => null,
        },
        component,
        args,
        element as SimpleElement,
        isIteractive
      );
    },
  };
}
